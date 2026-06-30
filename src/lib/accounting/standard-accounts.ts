import { db } from '@/lib/db/db';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { and, eq, inArray } from 'drizzle-orm';

export const STANDARD_ACCOUNTS = [
  { accountNumber: '411', name: 'Клиенти', type: 'asset' },
  { accountNumber: '401', name: 'Доставчици', type: 'liability' },
  { accountNumber: '503', name: 'Разплащателна сметка', type: 'asset' },
  { accountNumber: '601', name: 'Разходи за материали', type: 'expense' },
  { accountNumber: '701', name: 'Приходи от продажби', type: 'income' },
  { accountNumber: '4531', name: 'Начислен ДДС за покупки', type: 'asset' },
  { accountNumber: '4532', name: 'Начислен ДДС за продажби', type: 'liability' },
] as const;

export async function ensureStandardAccounts(tenantId: string): Promise<void> {
  const numbers = STANDARD_ACCOUNTS.map((a) => a.accountNumber);
  const existing = await db
    .select({ accountNumber: accountPlan.accountNumber })
    .from(accountPlan)
    .where(and(eq(accountPlan.tenantId, tenantId), inArray(accountPlan.accountNumber, numbers)));

  const existingSet = new Set(existing.map((row) => row.accountNumber));
  const missing = STANDARD_ACCOUNTS.filter((a) => !existingSet.has(a.accountNumber));

  if (missing.length === 0) return;

  await db.insert(accountPlan).values(
    missing.map((a) => ({
      tenantId,
      accountNumber: a.accountNumber,
      name: a.name,
      type: a.type,
    })),
  );
}
