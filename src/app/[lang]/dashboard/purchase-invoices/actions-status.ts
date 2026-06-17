'use server';
import { db } from '@/lib/db/db';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function getTenant() {
  const [tenant] = await db.select().from(tenants).limit(1);
  return tenant;
}

export async function approvePurchaseInvoice(id: string) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Lipсва Tenant' };
    const [inv] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    if (!inv) return { success: false, error: 'Not found' };
    if (inv.status !== 'draft') return { success: false, error: 'Not a draft' };
    await db.update(purchaseInvoices)
      .set({ status: 'approved' })
      .where(eq(purchaseInvoices.id, id));
    if (!inv.vatPosted) {
      const d = new Date(inv.issueDate || new Date());
      await db.insert(vatJournals).values({
        tenantId: tenant.id,
        type: 'purchase',
        periodYear: d.getFullYear(),
        periodMonth: d.getMonth() + 1,
        documentNumber: inv.invoiceNumber,
        documentDate: inv.issueDate || new Date().toISOString().split('T')[0],
        counterpartyName: inv.supplierName,
        counterpartyVat: inv.supplierVat || '',
        netAmount: inv.netAmount || '0',
        vatRate: '20',
        vatAmount: inv.vatAmount || '0',
      });
      await db.update(purchaseInvoices)
        .set({ vatPosted: true })
        .where(eq(purchaseInvoices.id, id));
    }
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function markPurchaseInvoicePaid(id: string) {
  try {
    await db.update(purchaseInvoices).set({ status: 'paid' }).where(eq(purchaseInvoices.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function cancelPurchaseInvoice(id: string) {
  try {
    await db.update(purchaseInvoices)
      .set({ status: 'cancelled' })
      .where(eq(purchaseInvoices.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}