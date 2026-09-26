'use server';

import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { counterparties } from '@/lib/db/schema/counterparties';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireTenant } from '@/lib/auth/get-tenant';
import { ensureAutoJournalForInvoice } from '@/lib/accounting/auto-journal';
import { syncStockFromSalesInvoice } from '@/lib/inventory/auto-stock';

function dbErrorText(error: any, fallback: string) {
  const code = error?.code || error?.cause?.code;
  if (code === 'ECONNREFUSED') return 'Базата данни не отговаря. Стартирай Postgres и опитай отново.';
  return error?.cause?.message || error?.message || fallback;
}

function money(value: number) {
  if (!Number.isFinite(value)) return '0.00';
  return (Math.round(value * 100) / 100).toFixed(2);
}

async function getTenant() {
  const { tenant, tenantId } = await requireTenant();
  return { ...tenant, id: tenant?.id || tenantId };
}

export async function getInvoices() {
  try {
    const { tenantId } = await requireTenant();
    if (!tenantId) return { success: false, error: 'Липсва Tenant', data: [] as never[] };
    const data = await db.select().from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt));
    return { success: true, data };
  } catch (error: any) {
    const detail = dbErrorText(error, 'Фактурите не се заредиха');
    console.error('[getInvoices]', detail);
    return { success: false, error: detail, data: [] as never[] };
  }
}

export async function getInvoiceWithLines(id: string) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: null };
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenant.id)));
    if (!invoice) return { success: false, error: 'Не е намерена', data: null };
    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id));
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
    const { tenantId } = await requireTenant();
    if (!tenantId) return { success: false, error: 'Липсва Tenant' };

    const computedLines = input.lines.map((line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const vatRate = Number(line.vatRate) || 0;
      const lineNet = Math.round(quantity * unitPrice * 100) / 100;
      const lineVat = Math.round((lineNet * vatRate) / 100 * 100) / 100;
      return {
        description: String(line.description || '').trim(),
        quantity,
        unitPrice,
        vatRate,
        lineNet,
        lineVat,
        lineTotal: lineNet + lineVat,
        skladItemId: (line as { skladItemId?: string | null }).skladItemId || null,
      };
    }).filter((line) => line.description);

    if (computedLines.length === 0) return { success: false, error: 'Добави поне един ред' };

    const netAmount = computedLines.reduce((sum, line) => sum + line.lineNet, 0);
    const vatAmount = computedLines.reduce((sum, line) => sum + line.lineVat, 0);
    const totalAmount = netAmount + vatAmount;
    const name = input.counterpartyName.trim();
    const total = money(totalAmount);

    const invoiceId = await db.transaction(async (tx) => {
      const [invoice] = await tx.insert(invoices).values({
        tenantId,
        invoiceNumber: input.invoiceNumber.trim(),
        type: 'invoice',
        status: 'draft',
        issueDate: input.issueDate,
        dueDate: input.dueDate?.trim() || null,
        clientName: name,
        counterpartyName: name,
        clientAddress: input.counterpartyAddress?.trim() || null,
        counterpartyAddress: input.counterpartyAddress?.trim() || null,
        clientVatNumber: input.counterpartyVat?.trim() || input.counterpartyEik?.trim() || null,
        counterpartyEik: input.counterpartyEik?.trim() || null,
        counterpartyVat: input.counterpartyVat?.trim() || null,
        subtotal: money(netAmount),
        netAmount: money(netAmount),
        amount: money(netAmount),
        vatAmount: money(vatAmount),
        totalAmount: total,
        total,
        notes: input.notes?.trim() || null,
        vatPosted: false,
        items: computedLines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          total: line.lineNet,
        })),
      }).returning({ id: invoices.id });

      if (!invoice?.id) throw new Error('Фактурата не беше записана');

      await tx.insert(invoiceLines).values(
        computedLines.map((line) => ({
          invoiceId: invoice.id,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: money(line.unitPrice),
          vatRate: String(line.vatRate),
          lineNet: money(line.lineNet),
          lineVat: money(line.lineVat),
          lineTotal: money(line.lineTotal),
          skladItemId: line.skladItemId,
        })),
      );

      return invoice.id;
    });

    const [saved] = await db.select({ id: invoices.id }).from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
    if (!saved) return { success: false, error: 'Фактурата не остана в базата' };

    revalidatePath('/', 'layout');
    return {
      success: true,
      id: invoiceId,
      invoice: {
        id: invoiceId,
        invoiceNumber: input.invoiceNumber.trim(),
        counterpartyName: name,
        clientName: name,
        dueDate: input.dueDate?.trim() || null,
        issueDate: input.issueDate,
        status: 'draft',
        totalAmount: total,
        total,
        netAmount: money(netAmount),
        vatAmount: money(vatAmount),
      },
    };
  } catch (error: any) {
    const detail = dbErrorText(error, 'Фактурата не беше записана');
    console.error('[createInvoice]', detail);
    return { success: false, error: detail };
  }
}

export async function issueInvoice(id: string) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };

    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenant.id)));
    if (!invoice) return { success: false, error: 'Не е намерена' };

    await db.update(invoices).set({ status: 'issued' }).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenant.id)));
    await ensureAutoJournalForInvoice(id, tenant.id);
    await syncStockFromSalesInvoice(id, tenant.id);

    if (!invoice.vatPosted) {
      const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
      const issueDateStr = invoice.issueDate || issueDate.toISOString().split('T')[0];
      await db.insert(vatJournals).values({
        tenantId: tenant.id,
        type: 'sales',
        periodYear: issueDate.getFullYear(),
        periodMonth: issueDate.getMonth() + 1,
        entryDate: issueDateStr,
        invoiceDate: issueDateStr,
        documentNumber: invoice.invoiceNumber,
        invoiceNumber: invoice.invoiceNumber,
        counterpartyName: invoice.counterpartyName,
        counterpartyVat: invoice.counterpartyVat || '',
        netAmount: invoice.netAmount || '0',
        vatRate: 20,
        vatAmount: invoice.vatAmount || '0',
        totalAmount: invoice.totalAmount || invoice.total || '0',
      });
      await db.update(invoices).set({ vatPosted: true }).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenant.id)));
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markInvoicePaid(id: string) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };
    await db.update(invoices).set({ status: 'paid' }).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenant.id)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelInvoice(id: string) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };
    await db.update(invoices).set({ status: 'cancelled' }).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenant.id)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}