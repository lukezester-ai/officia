// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { budgets } from '@/lib/db/schema/budgets';
import { requireTenant } from '@/lib/auth/get-tenant';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getBudgets() {
  const { tenantId } = await requireTenant();

  const rows = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      year: budgets.year,
      month: budgets.month,
      plannedAmount: budgets.plannedAmount,
      createdAt: budgets.createdAt,
    })
    .from(budgets)
    .where(eq(budgets.tenantId, tenantId));

  return rows;
}

export async function createBudget(data: {
  name: string;
  year: number;
  month?: number;
  plannedAmount: number;
}) {
  const { tenantId } = await requireTenant();

  await db.insert(budgets).values({
    tenantId,
    name: data.name,
    year: String(data.year),
    month: data.month != null ? String(data.month) : null,
    plannedAmount: String(data.plannedAmount),
  });

  revalidatePath('/ar/dashboard/accounting/budgets');
}

export async function deleteBudget(id: string) {
  const { tenantId } = await requireTenant();

  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.tenantId, tenantId)));

  revalidatePath('/ar/dashboard/accounting/budgets');
}
