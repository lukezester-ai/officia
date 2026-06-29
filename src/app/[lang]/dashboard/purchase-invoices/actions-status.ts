'use server';
import { db } from '@/lib/db/db';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';

async function getTenantContext() {
  const { tenantId } = await requireTenant();
  return { tenantId };
}

async function getTenantPurchaseInvoice(id: string, tenantId: string) {
  const [inv] = await db
    .select()
    .from(purchaseInvoices)
    .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));
  return inv ?? null;
}

export async function approvePurchaseInvoice(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    const inv = await getTenantPurchaseInvoice(id, tenantId);
    if (!inv) return { success: false, error: 'Not found' };
    if (inv.status !== 'draft') return { success: false, error: 'Not a draft' };

    await db
      .update(purchaseInvoices)
      .set({ status: 'approved' })
      .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));

    if (!inv.vatPosted) {
      const d = new Date(inv.issueDate || new Date());
      await db.insert(vatJournals).values({
        tenantId,
        type: 'purchases',
        periodYear: d.getFullYear(),
        periodMonth: d.getMonth() + 1,
        entryDate: inv.issueDate || new Date().toISOString().split('T')[0],
        documentNumber: inv.invoiceNumber,
        counterpartyName: inv.supplierName,
        counterpartyVat: inv.supplierVat || '',
        netAmount: inv.netAmount || '0',
        vatRate: 20,
        vatAmount: inv.vatAmount || '0',
      });
      await db
        .update(purchaseInvoices)
        .set({ vatPosted: true })
        .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function markPurchaseInvoicePaid(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    await db
      .update(purchaseInvoices)
      .set({ status: 'paid' })
      .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function cancelPurchaseInvoice(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    await db
      .update(purchaseInvoices)
      .set({ status: 'cancelled' })
      .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
