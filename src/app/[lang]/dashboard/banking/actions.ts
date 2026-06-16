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
      currency: accountData.currency || 'BGN',
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