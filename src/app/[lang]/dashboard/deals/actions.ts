'use server';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { isDealStage, parseDealAmount } from '@/lib/crm/deals';
import { db } from '@/lib/db/db';
import { counterparties } from '@/lib/db/schema/counterparties';
import { deals } from '@/lib/db/schema/deals';

export async function listDeals() {
  try {
    const { tenantId } = await requireTenant();
    const rows = await db.select({
      id: deals.id,
      title: deals.title,
      amount: deals.amount,
      currency: deals.currency,
      stage: deals.stage,
      counterpartyId: deals.counterpartyId,
      counterpartyName: counterparties.name,
      expectedClose: deals.expectedClose,
    }).from(deals)
      .leftJoin(counterparties, eq(deals.counterpartyId, counterparties.id))
      .where(eq(deals.tenantId, tenantId))
      .orderBy(desc(deals.createdAt));
    return { success: true as const, data: rows };
  } catch (error: any) {
    return { success: false as const, error: error.message, data: [] };
  }
}

export async function createDeal(input: {
  title: string;
  amount: string;
  currency: string;
  stage: string;
  counterpartyId?: string;
}) {
  try {
    const { tenantId } = await requireTenant();
    const title = input.title.trim();
    const amount = parseDealAmount(input.amount);
    const currency = input.currency.toUpperCase();
    if (title.length < 2 || title.length > 120) return { success: false, error: 'Името на сделката е между 2 и 120 знака.' };
    if (amount == null) return { success: false, error: 'Сумата е число с до два знака след десетичната точка.' };
    if (currency !== 'EUR' && currency !== 'BGN') return { success: false, error: 'Валутата е EUR или BGN.' };
    if (!isDealStage(input.stage)) return { success: false, error: 'Непознат етап.' };

    let counterpartyId: string | null = null;
    if (input.counterpartyId) {
      const [client] = await db.select({ id: counterparties.id }).from(counterparties).where(and(
        eq(counterparties.id, input.counterpartyId),
        eq(counterparties.tenantId, tenantId),
      )).limit(1);
      if (!client) return { success: false, error: 'Клиентът не е от този акаунт.' };
      counterpartyId = client.id;
    }

    await db.insert(deals).values({
      tenantId,
      counterpartyId,
      title,
      amount: amount.toFixed(2),
      currency,
      stage: input.stage,
    });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveDeal(id: string, stage: string) {
  try {
    const { tenantId } = await requireTenant();
    if (!isDealStage(stage)) return { success: false, error: 'Непознат етап.' };
    const updated = await db.update(deals)
      .set({ stage })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning({ id: deals.id });
    if (updated.length === 0) return { success: false, error: 'Сделката не е от този акаунт.' };
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
