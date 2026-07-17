// @ts-nocheck
'use server';
import { db } from '@/lib/db/db';
import { purchaseInvoices, purchaseInvoiceLines } from '@/lib/db/schema/purchase-invoices';
import { counterparties } from '@/lib/db/schema/counterparties';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireTenant } from '@/lib/auth/get-tenant';
import { cache } from 'react';

async function getTenant() {
  const { tenant } = await requireTenant();
  return tenant;
}

export const getPurchaseInvoices = cache(async () => {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Lipсва Tenant', data: [] };
    const data = await db.select().from(purchaseInvoices)
      .where(eq(purchaseInvoices.tenantId, tenant.id))
      .orderBy(desc(purchaseInvoices.createdAt));
    return { success: true, data };
  } catch (e: any) { return { success: false, error: e.message, data: [] }; }
});

export async function createPurchaseInvoice(input: any) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Lipсва Tenant' };
    const { lines, ...inv } = input;
    const computed = lines.map((l: any) => {
      const net = Math.round(l.quantity * l.unitPrice * 100) / 100;
      const vat = Math.round(net * l.vatRate / 100 * 100) / 100;
      return { ...l, net, vat, total: net + vat };
    });
    const netTotal = computed.reduce((s: number, l: any) => s + l.net, 0);
    const vatTotal = computed.reduce((s: number, l: any) => s + l.vat, 0);
    const [created] = await db.insert(purchaseInvoices).values({
      tenantId: tenant.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate || null,
      dueDate: inv.dueDate || null,
      supplierName: inv.supplierName,
      supplierEik: inv.supplierEik || null,
      supplierVat: inv.supplierVat || null,
      supplierAddress: inv.supplierAddress || null,
      notes: inv.notes || null,
      netAmount: netTotal.toString(),
      vatAmount: vatTotal.toString(),
      totalAmount: (netTotal + vatTotal).toString(),
      status: 'draft',
    }).returning();
    if (computed.length > 0) {
      await db.insert(purchaseInvoiceLines).values(
        computed.map((l: any, i: number) => ({
          invoiceId: created.id,
          description: l.description,
          quantity: l.quantity.toString(),
          unitPrice: l.unitPrice.toString(),
          vatRate: l.vatRate,
          lineNet: l.net.toString(),
          lineVat: l.vat.toString(),
          lineTotal: l.total.toString(),
          lineOrder: i,
        }))
      );
    }
    revalidatePath('/', 'layout');
    return { success: true, data: created };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function getSuppliersForSelect() {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, data: [] };
    const data = await db.select().from(counterparties)
      .where(eq(counterparties.tenantId, tenant.id));
    return { success: true, data: data.filter((c: any) => c.isActive) };
  } catch (e: any) { return { success: false, data: [] }; }
}