'use server';

import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';

async function getTenantContext() {
  const { tenantId, tenant } = await requireTenant();
  return { tenantId, tenant };
}

async function getTenantAccountIds(tenantId: string) {
  const accounts = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.tenantId, tenantId));
  return accounts.map((account) => account.id);
}

async function assertTransactionBelongsToTenant(transactionId: string, tenantId: string) {
  const accountIds = await getTenantAccountIds(tenantId);
  if (accountIds.length === 0) {
    throw new Error('Transaction not found');
  }

  const [transaction] = await db
    .select({ id: bankTransactions.id })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.id, transactionId),
        inArray(bankTransactions.accountId, accountIds),
      ),
    );

  if (!transaction) {
    throw new Error('Transaction not found');
  }
}

export async function getBankAccounts() {
  try {
    const { tenantId } = await getTenantContext();
    const data = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.tenantId, tenantId))
      .orderBy(desc(bankAccounts.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function getBankTransactions(accountId?: string) {
  try {
    const { tenantId } = await getTenantContext();
    const tenantAccounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.tenantId, tenantId));

    const accountIds = tenantAccounts.map((account) => account.id);
    if (accountIds.length === 0) {
      return { success: true, data: [] };
    }

    if (accountId && !accountIds.includes(accountId)) {
      return { success: false, error: 'Account not found', data: [] };
    }

    const data = accountId
      ? await db
          .select()
          .from(bankTransactions)
          .where(eq(bankTransactions.accountId, accountId))
          .orderBy(desc(bankTransactions.date))
          .limit(50)
      : await db
          .select()
          .from(bankTransactions)
          .where(inArray(bankTransactions.accountId, accountIds))
          .orderBy(desc(bankTransactions.date))
          .limit(50);

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createBankAccount(accountData: any) {
  try {
    const { tenantId } = await getTenantContext();

    const [newAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        institutionName: accountData.name,
        iban: accountData.iban,
        balance: accountData.balance || '0.00',
        currency: accountData.currency || 'EUR',
      })
      .returning();

    revalidatePath('/', 'layout');
    return { success: true, data: newAccount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reconcileTransaction(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    await assertTransactionBelongsToTenant(id, tenantId);
    await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTransactionsForReview() {
  try {
    const { tenantId } = await getTenantContext();
    const accountIds = await getTenantAccountIds(tenantId);
    if (accountIds.length === 0) {
      return { success: true, data: [] };
    }

    const data = await db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.reviewRequired, true),
          inArray(bankTransactions.accountId, accountIds),
        ),
      )
      .orderBy(desc(bankTransactions.date));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function acceptMatch(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    await assertTransactionBelongsToTenant(id, tenantId);
    await db
      .update(bankTransactions)
      .set({
        matchStatus: 'confirmed',
        isReconciled: true,
        reviewRequired: false,
      })
      .where(eq(bankTransactions.id, id));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectMatch(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    await assertTransactionBelongsToTenant(id, tenantId);
    await db
      .update(bankTransactions)
      .set({
        matchStatus: 'rejected',
        matchedInvoiceId: null,
        matchedExpenseId: null,
        reviewRequired: true,
      })
      .where(eq(bankTransactions.id, id));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAICandidates() {
  try {
    const { tenantId } = await getTenantContext();
    const { invoices } = await import('@/lib/db/schema/invoices');
    const { expenses } = await import('@/lib/db/schema/expenses');

    const openInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'unpaid')));

    const openExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tenantId, tenantId))
      .limit(50);

    const candidates = [
      ...openInvoices.map((inv) => ({
        id: inv.id.toString(),
        type: 'invoice' as const,
        counterpartyName: inv.clientName || inv.counterpartyName || 'Unknown',
        totalAmount: parseFloat(inv.totalAmount || inv.total || '0'),
        currency: 'EUR',
        documentNumber: inv.invoiceNumber || String(inv.id),
        date: inv.issueDate,
      })),
      ...openExpenses.map((exp) => ({
        id: exp.id.toString(),
        type: 'expense' as const,
        counterpartyName: exp.description || 'Unknown',
        totalAmount: parseFloat(exp.amount || '0'),
        currency: 'EUR',
        documentNumber: String(exp.id),
        date: exp.expenseDate ? new Date(exp.expenseDate).toISOString() : undefined,
      })),
    ];

    return { success: true, data: candidates };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function seedMockBankingData(bankName: string = 'UniCredit Bulbank') {
  try {
    const { tenantId } = await getTenantContext();

    const [newAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        institutionName: bankName,
        iban: `BG12${bankName.substring(0, 4).toUpperCase()}12345678901234`,
        balance: '15042.50',
        currency: 'BGN',
      })
      .returning();

    await db.insert(bankTransactions).values([
      {
        accountId: newAccount.id,
        amount: '1200.00',
        currency: 'BGN',
        date: new Date(),
        description: 'ОПЛАЩАНЕ ПО ФАКТУРА 0000000123',
        counterpartyName: 'МЕГА ТРЕЙД ООД',
        counterpartyIban: 'BG99SOMF99999999999999',
        isReconciled: false,
      },
      {
        accountId: newAccount.id,
        amount: '-45.00',
        currency: 'BGN',
        date: new Date(),
        description: 'АБОНАМЕНТ ТЕЛЕКОМ АД',
        counterpartyName: 'ТЕЛЕКОМ АД',
        counterpartyIban: 'BG11TELC11111111111111',
        isReconciled: false,
      },
      {
        accountId: newAccount.id,
        amount: '-250.00',
        currency: 'BGN',
        date: new Date(Date.now() - 86400000),
        description: 'ПОКУПКА КАНЦЕЛАРСКИ МАТЕРИАЛИ',
        counterpartyName: 'ОФИС СУПЕРСТОР',
        isReconciled: false,
      },
    ]);

    revalidatePath('/', 'layout');
    return { success: true, data: newAccount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
