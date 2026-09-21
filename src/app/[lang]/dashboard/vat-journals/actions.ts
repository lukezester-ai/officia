'use server';

import { db } from '@/lib/db/db';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getVatJournals(type: 'sales' | 'purchases', year: number, month: number) {
  try {
    const { tenantId } = await requireTenant();
    const data = await db.select().from(vatJournals)
      .where(and(
        eq(vatJournals.tenantId, tenantId),
        eq(vatJournals.type, type),
        eq(vatJournals.periodYear, year),
        eq(vatJournals.periodMonth, month)
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
    const { tenantId } = await requireTenant();
    const total = input.netAmount + input.vatAmount;
    const [entry] = await db.insert(vatJournals).values({
      tenantId,
      type: input.type,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      entryDate: input.documentDate,
      invoiceDate: input.documentDate,
      documentNumber: input.documentNumber,
      invoiceNumber: input.documentNumber,
      counterpartyName: input.counterpartyName,
      counterpartyVat: input.counterpartyVat || '',
      netAmount: input.netAmount.toString(),
      vatRate: input.vatRate,
      vatAmount: input.vatAmount.toString(),
      totalAmount: total.toString(),
    }).returning();
    revalidatePath('/', 'layout');
    return { success: true, data: entry };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteVatJournal(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await db.delete(vatJournals).where(and(eq(vatJournals.id, id), eq(vatJournals.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
