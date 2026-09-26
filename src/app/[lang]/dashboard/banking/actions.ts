'use server';

import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { invoices } from '@/lib/db/schema/invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { autoCloseMatchedDocument } from '@/lib/matching/auto-close';
import { requireTenant } from '@/lib/auth/get-tenant';
import { BankStatementParser } from '@/lib/accounting/bank-parser';
import { isValidIban, normalizeIban } from '@/lib/banking/iban';
import { buildPaymentCsv, validatePaymentLine, type PaymentKind } from '@/lib/banking/payment-file';
import { paymentOrders } from '@/lib/db/schema/payment_orders';

async function ownedAccountIds(tenantId: string) {
  const accounts = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId));
  return accounts.map((a) => a.id);
}

async function assertOwnedTransaction(txId: string, tenantId: string) {
  const [row] = await db
    .select({ id: bankTransactions.id })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
    .where(and(eq(bankTransactions.id, txId), eq(bankAccounts.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error('Транзакцията не принадлежи на този tenant.');
}

export async function getBankAccounts() {
  try {
    const { tenantId } = await requireTenant();
    const data = await db.select().from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId)).orderBy(desc(bankAccounts.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function getBankTransactions(accountId?: string) {
  try {
    const { tenantId } = await requireTenant();
    const ids = await ownedAccountIds(tenantId);
    if (ids.length === 0) return { success: true, data: [] };
    if (accountId && !ids.includes(accountId)) {
      return { success: false, error: 'Няма достъп до тази сметка', data: [] };
    }
    const data = await db
      .select()
      .from(bankTransactions)
      .where(inArray(bankTransactions.accountId, accountId ? [accountId] : ids))
      .orderBy(desc(bankTransactions.date))
      .limit(50);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createBankAccount(accountData: { name?: string; iban?: string; currency?: string; balance?: string }) {
  try {
    const { tenantId } = await requireTenant();
    const name = String(accountData.name ?? '').trim();
    const iban = normalizeIban(String(accountData.iban ?? ''));
    const currency = String(accountData.currency ?? 'EUR').toUpperCase();
    if (name.length < 2) return { success: false, error: 'Въведете име на банката.' };
    if (!isValidIban(iban)) return { success: false, error: 'IBAN е невалиден.' };
    if (currency !== 'EUR' && currency !== 'BGN') return { success: false, error: 'Валутата е EUR или BGN.' };

    const [newAccount] = await db.insert(bankAccounts).values({
      tenantId,
      institutionName: name,
      iban,
      balance: '0.00',
      currency,
    }).returning({
      id: bankAccounts.id,
      institutionName: bankAccounts.institutionName,
      iban: bankAccounts.iban,
      balance: bankAccounts.balance,
      currency: bankAccounts.currency,
    });

    revalidatePath('/', 'layout');
    return { success: true, data: newAccount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reconcileTransaction(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await assertOwnedTransaction(id, tenantId);
    await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTransactionsForReview() {
  try {
    const { tenantId } = await requireTenant();
    const ids = await ownedAccountIds(tenantId);
    if (ids.length === 0) return { success: true, data: [] };
    const data = await db.select().from(bankTransactions)
      .where(and(eq(bankTransactions.reviewRequired, true), inArray(bankTransactions.accountId, ids)))
      .orderBy(desc(bankTransactions.date));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function acceptMatch(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await assertOwnedTransaction(id, tenantId);
    await db.update(bankTransactions).set({
      matchStatus: 'confirmed',
      isReconciled: true,
      reviewRequired: false
    }).where(eq(bankTransactions.id, id));

    await autoCloseMatchedDocument(id);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectMatch(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await assertOwnedTransaction(id, tenantId);
    await db.update(bankTransactions).set({
      matchStatus: 'rejected',
      matchedInvoiceId: null,
      matchedExpenseId: null,
      reviewRequired: true
    }).where(eq(bankTransactions.id, id));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function manualMatch(txId: string, documentId: string, documentType: 'invoice' | 'expense') {
  try {
    const { tenantId } = await requireTenant();
    await assertOwnedTransaction(txId, tenantId);
    await db.update(bankTransactions).set({
      matchStatus: 'confirmed',
      isReconciled: true,
      reviewRequired: false,
      matchedInvoiceId: documentType === 'invoice' ? documentId : null,
      matchedExpenseId: documentType === 'expense' ? documentId : null,
    }).where(eq(bankTransactions.id, txId));
    await autoCloseMatchedDocument(txId);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAICandidates() {
  try {
    const { tenantId } = await requireTenant();
    const openInvoices = await db.select().from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'unpaid')));
    const openExpenses = await db.select().from(expenses)
      .where(eq(expenses.tenantId, tenantId));

    const candidates = [
      ...openInvoices.map(inv => ({
        id: inv.id.toString(),
        type: 'invoice' as const,
        counterpartyName: inv.clientName || inv.counterpartyName || 'Unknown',
        totalAmount: parseFloat(inv.totalAmount || inv.total || '0'),
        currency: 'EUR',
        documentNumber: inv.invoiceNumber || String(inv.id),
        date: inv.issueDate
      })),
      ...openExpenses.map(exp => ({
        id: exp.id.toString(),
        type: 'expense' as const,
        counterpartyName: exp.description || 'Unknown',
        totalAmount: parseFloat(exp.amount || '0'),
        currency: 'BGN',
        documentNumber: String(exp.id),
        date: exp.expenseDate ? new Date(exp.expenseDate).toISOString() : undefined
      }))
    ];

    return { success: true, data: candidates };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function seedMockBankingData(_bankName: string = 'UniCredit Bulbank') {
  if (process.env.ALLOW_INTEGRATION_SIMULATION !== 'true') {
    return {
      success: false,
      error: 'Отвореното банкиране (PSD2) не е свързано. Не се създават фалшиви сметки и транзакции.',
    };
  }
  try {
    const { tenantId } = await requireTenant();
    const [newAccount] = await db.insert(bankAccounts).values({
      tenantId,
      institutionName: _bankName,
      iban: null,
      balance: '0.00',
      currency: 'BGN',
    }).returning();
    revalidatePath('/', 'layout');
    return { success: true, data: newAccount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function importBankStatement(accountId: string, csvText: string) {
  try {
    const { tenantId } = await requireTenant();
    const ids = await ownedAccountIds(tenantId);
    if (!ids.includes(accountId)) return { success: false, error: 'Няма достъп до тази сметка.' };

    const parsed = BankStatementParser.parseCSV(csvText).filter((tx) => Number.isFinite(tx.amount) && !Number.isNaN(tx.date.getTime()));
    if (parsed.length === 0) return { success: false, error: 'Файлът няма разпознати движения. Очакват се колони Дата и Сума.' };

    await db.insert(bankTransactions).values(parsed.map((tx) => ({
      accountId,
      amount: String(tx.amount),
      date: tx.date,
      description: tx.description,
      counterpartyName: tx.counterpartyName,
      counterpartyIban: tx.counterpartyIban,
      isReconciled: false,
    })));

    revalidatePath('/', 'layout');
    return { success: true, count: parsed.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listPaymentOrders() {
  try {
    const { tenantId } = await requireTenant();
    const rows = await db.select().from(paymentOrders)
      .where(eq(paymentOrders.tenantId, tenantId))
      .orderBy(desc(paymentOrders.createdAt))
      .limit(40);
    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        kind: row.kind,
        beneficiaryName: row.beneficiaryName,
        beneficiaryIban: row.beneficiaryIban,
        amount: row.amount,
        currency: row.currency,
        reason: row.reason,
        budgetCode: row.budgetCode,
        status: row.status,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createPaymentOrder(input: {
  accountId: string;
  kind: PaymentKind;
  beneficiaryName: string;
  beneficiaryIban: string;
  amount: number;
  currency: string;
  reason: string;
  budgetCode?: string;
  liableId?: string;
  documentNumber?: string;
  documentDate?: string;
  period?: string;
}) {
  try {
    const { tenantId } = await requireTenant();
    const ids = await ownedAccountIds(tenantId);
    if (!ids.includes(input.accountId)) return { success: false, error: 'Няма достъп до тази сметка.' };
    if (input.kind !== 'transfer' && input.kind !== 'budget') return { success: false, error: 'Видът е превод или бюджетно плащане.' };

    const line = {
      beneficiaryName: input.beneficiaryName,
      beneficiaryIban: input.beneficiaryIban,
      amount: Number(input.amount),
      currency: input.currency || 'EUR',
      reason: input.reason,
      kind: input.kind,
      budgetCode: input.budgetCode,
      liableId: input.liableId,
      documentNumber: input.documentNumber,
      documentDate: input.documentDate,
      period: input.period,
    };
    const problem = validatePaymentLine(line);
    if (problem) return { success: false, error: problem };

    const [created] = await db.insert(paymentOrders).values({
      tenantId,
      accountId: input.accountId,
      kind: line.kind,
      beneficiaryName: line.beneficiaryName.trim(),
      beneficiaryIban: normalizeIban(line.beneficiaryIban),
      amount: line.amount.toFixed(2),
      currency: line.currency.toUpperCase(),
      reason: line.reason.trim(),
      budgetCode: line.kind === 'budget' ? line.budgetCode?.trim() : null,
      liableId: line.kind === 'budget' ? line.liableId?.trim() : null,
      documentNumber: line.documentNumber?.trim() || null,
      documentDate: line.documentDate?.trim() || null,
      period: line.period?.trim() || null,
      status: 'draft',
    }).returning({ id: paymentOrders.id });

    revalidatePath('/', 'layout');
    return { success: true, id: created.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function exportPaymentOrders(accountId: string) {
  try {
    const { tenantId } = await requireTenant();
    const [account] = await db.select().from(bankAccounts).where(and(
      eq(bankAccounts.id, accountId),
      eq(bankAccounts.tenantId, tenantId),
    )).limit(1);
    if (!account?.iban) return { success: false, error: 'Сметката няма IBAN.' };

    const rows = await db.select().from(paymentOrders).where(and(
      eq(paymentOrders.tenantId, tenantId),
      eq(paymentOrders.accountId, accountId),
      eq(paymentOrders.status, 'draft'),
    ));
    if (rows.length === 0) return { success: false, error: 'Няма чернови за експорт.' };

    const csv = buildPaymentCsv(account.iban, rows.map((row) => ({
      beneficiaryName: row.beneficiaryName,
      beneficiaryIban: row.beneficiaryIban,
      amount: Number(row.amount),
      currency: row.currency || 'EUR',
      reason: row.reason,
      kind: row.kind === 'budget' ? 'budget' : 'transfer',
      budgetCode: row.budgetCode || undefined,
      liableId: row.liableId || undefined,
      documentNumber: row.documentNumber || undefined,
      documentDate: row.documentDate || undefined,
      period: row.period || undefined,
    })));

    await db.update(paymentOrders)
      .set({ status: 'exported' })
      .where(and(
        eq(paymentOrders.tenantId, tenantId),
        inArray(paymentOrders.id, rows.map((row) => row.id)),
      ));

    const day = new Date().toISOString().slice(0, 10);
    return { success: true, csv, filename: `payments-${day}.csv`, count: rows.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
