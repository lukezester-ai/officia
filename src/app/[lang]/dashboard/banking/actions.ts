// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getBankAccounts() {
  try {
    const data = await db.select().from(bankAccounts).orderBy(desc(bankAccounts.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function getBankTransactions(accountId?: string) {
  try {
    const data = accountId
      ? await db.select().from(bankTransactions).where(eq(bankTransactions.accountId, accountId)).orderBy(desc(bankTransactions.date)).limit(50)
      : await db.select().from(bankTransactions).orderBy(desc(bankTransactions.date)).limit(50);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createBankAccount(accountData: any) {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) return { success: false, error: 'Липсва конфигурация за компанията' };

    const [newAccount] = await db.insert(bankAccounts).values({
      tenantId: tenant.id,
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
    await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
export async function getTransactionsForReview() {
  try {
    const data = await db.select().from(bankTransactions)
      .where(eq(bankTransactions.reviewRequired, true))
      .orderBy(desc(bankTransactions.date));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function acceptMatch(id: string) {
  try {
    await db.update(bankTransactions).set({ 
      matchStatus: 'confirmed', 
      isReconciled: true,
      reviewRequired: false 
    }).where(eq(bankTransactions.id, id));
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectMatch(id: string) {
  try {
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

export async function getAICandidates() {
  try {
    const { invoices } = await import('@/lib/db/schema/invoices');
    const { expenses } = await import('@/lib/db/schema/expenses');

    // Fetch unpaid/open invoices (sales)
    const openInvoices = await db.select().from(invoices)
      .where(eq(invoices.status, 'unpaid')); // using standard status if any

    // Fetch unpaid/open expenses
    const openExpenses = await db.select().from(expenses)
      .where(eq(expenses.status, 'pending'));

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
        counterpartyName: exp.vendorName || 'Unknown',
        totalAmount: parseFloat(exp.amount || '0'),
        currency: exp.currency || 'EUR',
        documentNumber: exp.documentNumber || String(exp.id),
        date: exp.date ? new Date(exp.date).toISOString() : undefined
      }))
    ];

    return { success: true, data: candidates };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function seedMockBankingData() {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) return { success: false, error: 'Липсва конфигурация за компанията' };

    const [newAccount] = await db.insert(bankAccounts).values({
      tenantId: tenant.id,
      institutionName: 'UniCredit Bulbank',
      iban: 'BG12UNCR12345678901234',
      balance: '15042.50',
      currency: 'BGN',
    }).returning();

    // Insert mock transactions
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
      }
    ]);

    revalidatePath('/', 'layout');
    return { success: true, data: newAccount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

