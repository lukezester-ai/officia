import { db } from '@/lib/db/db';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { and, eq } from 'drizzle-orm';

export const STANDARD_ACCOUNTS: Record<string, { name: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }> = {
  '411': { name: 'Клиенти (Вземания по продажби)', type: 'asset' },
  '401': { name: 'Доставчици (Задължения)', type: 'liability' },
  '501': { name: 'Каса', type: 'asset' },
  '503': { name: 'Разплащателна сметка', type: 'asset' },
  '601': { name: 'Разходи за външни услуги и материали', type: 'expense' },
  '603': { name: 'Разходи за амортизация', type: 'expense' },
  '701': { name: 'Приходи от продажби на услуги и стоки', type: 'revenue' },
  '241': { name: 'Амортизация на ДМА', type: 'asset' },
  '4531': { name: 'Начислен ДДС за покупки (Данъчен кредит)', type: 'asset' },
  '4532': { name: 'Начислен ДДС за продажбите', type: 'liability' },
};

type DbLike = any;

export async function findOrCreateAccount(
  tenantId: string,
  code: string,
  tx: DbLike = db,
  name?: string,
  type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
) {
  if (!tenantId) throw new Error('Липсва tenant за сметкоплан.');
  const meta = STANDARD_ACCOUNTS[code];
  const accountName = name || meta?.name || `Сметка ${code}`;
  const accountType = type || meta?.type || 'asset';

  const [found] = await tx
    .select()
    .from(accountPlan)
    .where(and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, code)))
    .limit(1);
  if (found) return found.id;

  const [created] = await tx
    .insert(accountPlan)
    .values({
      tenantId,
      accountNumber: code,
      name: accountName,
      type: accountType,
      isActive: true,
    })
    .returning();
  return created.id;
}
