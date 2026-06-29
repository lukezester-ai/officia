import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { and, eq, type SQL } from 'drizzle-orm';

export async function findBankTransactionForTenant(tenantId: string, bankTxId: string) {
  const [row] = await db
    .select({ transaction: bankTransactions })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.id, bankTxId)))
    .limit(1);

  return row?.transaction ?? null;
}

export async function listBankTransactionsForTenant(tenantId: string, extra?: SQL) {
  return db
    .select({ transaction: bankTransactions })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
    .where(extra ? and(eq(bankAccounts.tenantId, tenantId), extra) : eq(bankAccounts.tenantId, tenantId));
}
