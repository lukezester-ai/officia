'use server';

import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { counterparties } from '@/lib/db/schema/counterparties';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireTenant } from '@/lib/auth/get-tenant';

async function getTenant() {
  const { tenant } = await requireTenant();
  return tenant;
}

export async function getInvoices() {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: [] };
    const data = await db.select().from(invoices)
      .where(eq(invoices.tenantId, tenant.id))
      .orderBy(desc(invoices.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

async function parseInvoiceId(id: string): Promise<number | null> {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export async function getInvoiceWithLines(id: string) {
  try {
    const invoiceId = await parseInvoiceId(id);
    if (invoiceId === null) return { success: false, error: 'Невалиден ID', data: null };
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return { success: false, error: 'Не е намерена', data: null };
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
    return { success: true, data: { ...invoice, lines } };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

export async function getCounterpartiesForSelect() {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, data: [] };
    const data = await db.select().from(counterparties)
      .where(eq(counterparties.tenantId, tenant.id));
    return { success: true, data: data.filter(c => c.isActive) };
  } catch (error: any) {
    return { success: false, data: [] };
  }
}

export async function createInvoice(input: {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  counterpartyName: string;
  counterpartyEik?: string;
  counterpartyVat?: string;
  counterpartyAddress?: string;
  notes?: string;
  lines: { description: string; quantity: number; unitPrice: number; vatRate: number }[];
}) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };

    const computedLines = input.lines.map(l => {
      const lineNet = Math.round(l.quantity * l.unitPrice * 100) / 100;
      const lineVat = Math.round(lineNet * l.vatRate / 100 * 100) / 100;
      return { ...l, lineNet, lineVat, lineTotal: lineNet + lineVat };
    });
    const netAmount = computedLines.reduce((s, l) => s + l.lineNet, 0);
    const vatAmount = computedLines.reduce((s, l) => s + l.lineVat, 0);
    const totalAmount = netAmount + vatAmount;

    const [invoice] = await db.insert(invoices).values({
      tenantId: tenant.id,
      invoiceNumber: input.invoiceNumber,
      type: 'invoice',
      status: 'draft',
      issueDate: input.issueDate,
      dueDate: input.dueDate || null,
      counterpartyName: input.counterpartyName,
      counterpartyEik: input.counterpartyEik || null,
      counterpartyVat: input.counterpartyVat || null,
      counterpartyAddress: input.counterpartyAddress || null,
      netAmount: netAmount.toString(),
      vatAmount: vatAmount.toString(),
      totalAmount: totalAmount.toString(),
      notes: input.notes || null,
      vatPosted: false,
    }).returning();

    if (computedLines.length > 0) {
      await db.insert(invoiceLines).values(
        computedLines.map(l => ({
          invoiceId: invoice.id,
          description: l.description,
          quantity: l.quantity.toString(),
          unitPrice: l.unitPrice.toString(),
          vatRate: l.vatRate.toString(),
          lineNet: l.lineNet.toString(),
          lineVat: l.lineVat.toString(),
          lineTotal: l.lineTotal.toString(),
        }))
      );
    }

    revalidatePath('/', 'layout');
    return { success: true, data: invoice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function issueInvoice(id: string) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };

    const invoiceId = await parseInvoiceId(id);
    if (invoiceId === null) return { success: false, error: 'Невалиден ID' };

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return { success: false, error: 'Не е намерена' };

    await db.update(invoices).set({ status: 'issued' }).where(eq(invoices.id, invoiceId));

    if (!invoice.vatPosted) {
      const issueDateStr = invoice.issueDate || new Date().toISOString().slice(0, 10);
      const issueDate = new Date(issueDateStr);
      await db.insert(vatJournals).values({
        tenantId: tenant.id,
        type: 'sales',
        periodYear: issueDate.getFullYear(),
        periodMonth: issueDate.getMonth() + 1,
        entryDate: issueDateStr,
        documentNumber: invoice.invoiceNumber,
        counterpartyName: invoice.counterpartyName,
        counterpartyVat: invoice.counterpartyVat || '',
        netAmount: invoice.netAmount || '0',
        vatRate: 20,
        vatAmount: invoice.vatAmount || '0',
      });
      await db.update(invoices).set({ vatPosted: true }).where(eq(invoices.id, invoiceId));
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markInvoicePaid(id: string) {
  try {
    const invoiceId = await parseInvoiceId(id);
    if (invoiceId === null) return { success: false, error: 'Невалиден ID' };
    await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, invoiceId));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelInvoice(id: string) {
  try {
    const invoiceId = await parseInvoiceId(id);
    if (invoiceId === null) return { success: false, error: 'Невалиден ID' };
    await db.update(invoices).set({ status: 'cancelled' }).where(eq(invoices.id, invoiceId));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}