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

export async function createBankAccount(accountData: any) {
  try {
    const { tenantId } = await requireTenant();
    const [newAccount] = await db.insert(bankAccounts).values({
      tenantId,
      institutionName: accountData.name,
      iban: accountData.iban,
      balance: accountData.balance || '0.00',
      currency: accountData.currency || 'EUR',
    }).returning();

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
