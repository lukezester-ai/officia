'use server';

import { db } from '@/lib/db/db';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function getTenant() {
  const [tenant] = await db.select().from(tenants).limit(1);
  return tenant;
}

export async function getVatJournals(type: 'sales' | 'purchases', year: number, month: number) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: [] };
    const data = await db.select().from(vatJournals)
      .where(and(
        eq(vatJournals.tenantId, tenant.id),
        eq(vatJournals.type, type),
        sql`${vatJournals.periodYear} = ${year}`,
        sql`${vatJournals.periodMonth} = ${month}`
      ))
      .orderBy(desc(vatJournals.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createVatJournal(input: {
  type: 'sales' | 'purchases';
  periodYear: number;
  periodMonth: number;
  documentNumber: string;
  documentDate: string;
  counterpartyName: string;
  counterpartyVat?: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
}) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };
    const [entry] = await db.insert(vatJournals).values({
      tenantId: tenant.id,
      type: input.type,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      documentNumber: input.documentNumber,
      documentDate: input.documentDate,
      counterpartyName: input.counterpartyName,
      counterpartyVat: input.counterpartyVat || '',
      netAmount: input.netAmount.toString(),
      vatRate: input.vatRate.toString(),
      vatAmount: input.vatAmount.toString(),
    }).returning();
    revalidatePath('/', 'layout');
    return { success: true, data: entry };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteVatJournal(id: string) {
  try {
    await db.delete(vatJournals).where(eq(vatJournals.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}