'use server';
import { db } from '@/lib/db';
import { purchaseInvoices, vatJournalEntries } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function approvePurchaseInvoice(id: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };
    const inv = await db.query.purchaseInvoices.findFirst({
      where: and(
        eq(purchaseInvoices.id, id),
        eq(purchaseInvoices.userId, userId)
      ),
    });
    if (!inv) return { success: false, error: 'Not found' };
    if (inv.status !== 'draft') return { success: false, error: 'Ne e chernova' };
    await db.update(purchaseInvoices)
      .set({ status: 'approved', vatPosted: true })
      .where(eq(purchaseInvoices.id, id));
    await db.insert(vatJournalEntries).values({
      id: randomUUID(),
      userId,
      type: 'purchase',
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate || new Date().toISOString().split('T')[0],
      counterpartyName: inv.supplierName,
      counterpartyVat: inv.supplierVat || '',
      netAmount: inv.netAmount,
      vatAmount: inv.vatAmount,
      totalAmount: inv.totalAmount,
      vatRate: 20,
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function markPurchaseInvoicePaid(id: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };
    await db.update(purchaseInvoices)
      .set({ status: 'paid' })
      .where(and(
        eq(purchaseInvoices.id, id),
        eq(purchaseInvoices.userId, userId)
      ));
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function cancelPurchaseInvoice(id: string) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };
    await db.update(purchaseInvoices)
      .set({ status: 'cancelled' })
      .where(and(
        eq(purchaseInvoices.id, id),
        eq(purchaseInvoices.userId, userId)
      ));
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}
