'use server';

import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/auth/get-tenant';
import { chooseInvoiceNumber } from '@/lib/accounting/invoice-number';
import { ensureAutoJournalForInvoice } from '@/lib/accounting/auto-journal';
import { syncStockFromSalesInvoice } from '@/lib/inventory/auto-stock';
import { isUuid } from '@/lib/utils/ids';

const POSTED_STATUSES = new Set(['issued', 'approved', 'sent', 'paid']);

function money(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

async function postInvoiceSideEffects(invoiceId: string, tenantId: string, status: string) {
  if (!POSTED_STATUSES.has(status)) return;
  await ensureAutoJournalForInvoice(invoiceId, tenantId);
  await syncStockFromSalesInvoice(invoiceId, tenantId);
}

export async function createInvoice(
  lang: string,
  data: {
    invoiceNumber: string;
    clientName: string;
    clientAddress: string;
    clientVatNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    notes: string;
    items: { description?: string; quantity?: number; unitPrice?: number; vatRate?: number }[];
    subtotal: string;
    vatAmount: string;
    total: string;
  },
): Promise<{ error: string } | void> {
  const clientName = data.clientName.trim();
  if (!clientName) return { error: 'Въведете име на клиент' };

  const sourceItems = Array.isArray(data.items) ? data.items : [];
  if (sourceItems.length === 0 || sourceItems.some((item) => !String(item.description ?? '').trim())) {
    return { error: 'Попълнете описание на редовете' };
  }

  const computed = sourceItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const vatRate = Number(item.vatRate) || 0;
    const lineNet = Math.round(quantity * unitPrice * 100) / 100;
    const lineVat = Math.round((lineNet * vatRate) / 100 * 100) / 100;
    return {
      description: String(item.description).trim(),
      quantity,
      unitPrice,
      vatRate,
      lineNet,
      lineVat,
    };
  });

  const net = computed.reduce((sum, line) => sum + line.lineNet, 0);
  const vat = computed.reduce((sum, line) => sum + line.lineVat, 0);
  const total = net + vat;
  const status = data.status === 'sent' ? 'sent' : 'draft';
  const taxId = data.clientVatNumber.trim();

  let invoiceId = '';
  let tenantId = '';
  try {
    const tenant = await requireTenant();
    tenantId = tenant.tenantId;
    const user = tenant.user;
    const existing = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));
    const takenNumbers = existing.map((row) => row.invoiceNumber);
    const requestedNumber = data.invoiceNumber.trim();
    if (
      requestedNumber &&
      requestedNumber !== '0000000001' &&
      takenNumbers.some((number) => number === requestedNumber)
    ) {
      return { error: 'Този номер вече се използва' };
    }
    const invoiceNumber = chooseInvoiceNumber(data.invoiceNumber, takenNumbers);
    const userId = isUuid(String(user?.id ?? '')) ? String(user.id) : null;

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(invoices)
        .values({
          tenantId,
          userId,
          invoiceNumber,
          type: 'invoice',
          status,
          clientName,
          counterpartyName: clientName,
          clientAddress: data.clientAddress.trim() || null,
          counterpartyAddress: data.clientAddress.trim() || null,
          clientVatNumber: taxId || null,
          counterpartyEik: taxId || null,
          counterpartyVat: /^BG\d+/i.test(taxId) ? taxId.toUpperCase() : null,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          notes: data.notes.trim() || null,
          items: computed.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            total: line.lineNet,
          })),
          subtotal: money(net),
          netAmount: money(net),
          amount: money(net),
          vatAmount: money(vat),
          total: money(total),
          totalAmount: money(total),
        })
        .returning({ id: invoices.id });

      await tx.insert(invoiceLines).values(
        computed.map((line) => ({
          invoiceId: row.id,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: money(line.unitPrice),
          vatRate: String(line.vatRate),
          lineNet: money(line.lineNet),
          lineVat: money(line.lineVat),
          lineTotal: money(line.lineNet + line.lineVat),
        })),
      );

      return row;
    });

    invoiceId = created.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Фактурата не беше записана' };
  }

  try {
    await postInvoiceSideEffects(invoiceId, tenantId, status);
  } catch (error) {
    console.error('[createInvoice] journal/stock', error);
  }

  revalidatePath(`/${lang}/dashboard/accounting/invoices`);
  redirect(`/${lang}/dashboard/accounting/invoices/${invoiceId}`);
}

export async function updateInvoiceStatus(id: string, status: string, lang: string) {
  if (!isUuid(id)) throw new Error('Невалидна фактура');
  if (!['draft', 'sent', 'paid', 'overdue', 'issued', 'approved'].includes(status)) {
    throw new Error('Невалиден статус');
  }

  const { tenantId } = await requireTenant();
  const [inv] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
    .returning({ id: invoices.id });

  if (!inv) throw new Error('Фактурата не е намерена');
  await postInvoiceSideEffects(id, tenantId, status);
  revalidatePath(`/${lang}/dashboard/accounting/invoices`);
  revalidatePath(`/${lang}/dashboard/accounting/invoices/${id}`);
}

export async function deleteInvoice(id: string, lang: string) {
  if (!isUuid(id)) throw new Error('Невалидна фактура');
  const { tenantId } = await requireTenant();
  const deleted = await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
    .returning({ id: invoices.id });

  if (deleted.length === 0) throw new Error('Фактурата не е намерена');
  revalidatePath(`/${lang}/dashboard/accounting/invoices`);
  redirect(`/${lang}/dashboard/accounting/invoices`);
}
