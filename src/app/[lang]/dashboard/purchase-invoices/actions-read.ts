'use server';
import { db } from '@/lib/db';
import { purchaseInvoices, purchaseInvoiceLines, counterparties } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function getPurchaseInvoices() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await db.select().from(purchaseInvoices)
      .where(eq(purchaseInvoices.userId, userId))
      .orderBy(desc(purchaseInvoices.createdAt));
    return { success: true, data };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function createPurchaseInvoice(input: any) {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };
    const { lines, ...inv } = input;
    const computed = lines.map((l: any) => {
      const net = Math.round(l.quantity * l.unitPrice * 100) / 100;
      const vat = Math.round(net * l.vatRate / 100 * 100) / 100;
      return { ...l, net, vat, total: net + vat };
    });
    const netTotal = computed.reduce((s: number, l: any) => s + l.net, 0);
    const vatTotal = computed.reduce((s: number, l: any) => s + l.vat, 0);
    const [created] = await db.insert(purchaseInvoices).values({
      id: randomUUID(), userId, ...inv,
      netAmount: netTotal.toFixed(2),
      vatAmount: vatTotal.toFixed(2),
      totalAmount: (netTotal + vatTotal).toFixed(2),
      status: 'draft',
    }).returning();
    await db.insert(purchaseInvoiceLines).values(
      computed.map((l: any, i: number) => ({
        id: randomUUID(),
        invoiceId: created.id,
        description: l.description,
        quantity: String(l.quantity),
        unitPrice: String(l.unitPrice),
        vatRate: l.vatRate,
        netAmount: l.net.toFixed(2),
        vatAmount: l.vat.toFixed(2),
        totalAmount: l.total.toFixed(2),
        lineOrder: i,
      }))
    );
    return { success: true, data: created };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function getSuppliersForSelect() {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };
    const data = await db.select().from(counterparties)
      .where(eq(counterparties.userId, userId));
    return { success: true, data };
  } catch (e: any) { return { success: false, error: e.message }; }
}
