'use server';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { chooseInvoiceNumber } from '@/lib/accounting/invoice-number';
import { splitDealAmount } from '@/lib/crm/deal-invoice';
import { isDealStage, parseDealAmount } from '@/lib/crm/deals';
import { db } from '@/lib/db/db';
import { counterparties } from '@/lib/db/schema/counterparties';
import { deals } from '@/lib/db/schema/deals';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';

export async function listDeals() {
  try {
    const { tenantId } = await requireTenant();
    const rows = await db.select({
      id: deals.id,
      title: deals.title,
      amount: deals.amount,
      currency: deals.currency,
      stage: deals.stage,
      counterpartyId: deals.counterpartyId,
      counterpartyName: counterparties.name,
      expectedClose: deals.expectedClose,
      invoiceId: deals.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      invoiceStatus: invoices.status,
    }).from(deals)
      .leftJoin(counterparties, eq(deals.counterpartyId, counterparties.id))
      .leftJoin(invoices, eq(deals.invoiceId, invoices.id))
      .where(eq(deals.tenantId, tenantId))
      .orderBy(desc(deals.createdAt));
    return { success: true as const, data: rows };
  } catch (error: any) {
    return { success: false as const, error: error.message, data: [] };
  }
}

export async function createDeal(input: {
  title: string;
  amount: string;
  currency: string;
  stage: string;
  counterpartyId?: string;
}) {
  try {
    const { tenantId } = await requireTenant();
    const title = input.title.trim();
    const amount = parseDealAmount(input.amount);
    const currency = input.currency.toUpperCase();
    if (title.length < 2 || title.length > 120) return { success: false, error: 'Името на сделката е между 2 и 120 знака.' };
    if (amount == null) return { success: false, error: 'Сумата е число с до два знака след десетичната точка.' };
    if (currency !== 'EUR' && currency !== 'BGN') return { success: false, error: 'Валутата е EUR или BGN.' };
    if (!isDealStage(input.stage)) return { success: false, error: 'Непознат етап.' };

    let counterpartyId: string | null = null;
    if (input.counterpartyId) {
      const [client] = await db.select({ id: counterparties.id }).from(counterparties).where(and(
        eq(counterparties.id, input.counterpartyId),
        eq(counterparties.tenantId, tenantId),
      )).limit(1);
      if (!client) return { success: false, error: 'Клиентът не е от този акаунт.' };
      counterpartyId = client.id;
    }

    await db.insert(deals).values({
      tenantId,
      counterpartyId,
      title,
      amount: amount.toFixed(2),
      currency,
      stage: input.stage,
    });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveDeal(id: string, stage: string) {
  try {
    const { tenantId } = await requireTenant();
    if (!isDealStage(stage)) return { success: false, error: 'Непознат етап.' };

    const [deal] = await db.select().from(deals).where(and(eq(deals.id, id), eq(deals.tenantId, tenantId))).limit(1);
    if (!deal) return { success: false, error: 'Сделката не е от този акаунт.' };

    let invoiceNumber: string | undefined;
    let invoiceId = deal.invoiceId;

    if (stage === 'won' && !invoiceId) {
      const amounts = splitDealAmount(deal.amount);
      if (!amounts) return { success: false, error: 'Сумата на сделката не става за фактура.' };

      const [client] = deal.counterpartyId
        ? await db.select().from(counterparties).where(and(
          eq(counterparties.id, deal.counterpartyId),
          eq(counterparties.tenantId, tenantId),
        )).limit(1)
        : [];

      const existing = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).where(eq(invoices.tenantId, tenantId));
      invoiceNumber = chooseInvoiceNumber('', existing.map((row) => row.invoiceNumber));
      const clientName = client?.name || deal.title;
      const address = [client?.address, client?.city].filter(Boolean).join(', ') || null;
      const today = new Date().toISOString().slice(0, 10);

      invoiceId = await db.transaction(async (tx) => {
        const [invoice] = await tx.insert(invoices).values({
          tenantId,
          invoiceNumber,
          type: 'invoice',
          status: 'draft',
          issueDate: today,
          clientName,
          counterpartyName: clientName,
          clientAddress: address,
          counterpartyAddress: address,
          clientVatNumber: client?.vatNumber || client?.eik || null,
          counterpartyEik: client?.eik || null,
          counterpartyVat: client?.vatNumber || null,
          subtotal: amounts.net,
          netAmount: amounts.net,
          amount: amounts.net,
          vatAmount: amounts.vat,
          totalAmount: amounts.total,
          total: amounts.total,
          notes: `От сделка: ${deal.title}`,
          vatPosted: false,
          items: [{
            description: deal.title,
            quantity: 1,
            unitPrice: Number(amounts.net),
            vatRate: 20,
            total: Number(amounts.net),
          }],
        }).returning({ id: invoices.id });
        if (!invoice?.id) throw new Error('Фактурата не беше записана');
        await tx.insert(invoiceLines).values({
          invoiceId: invoice.id,
          description: deal.title,
          quantity: '1',
          unitPrice: amounts.net,
          vatRate: '20',
          lineNet: amounts.net,
          lineVat: amounts.vat,
          lineTotal: amounts.total,
        });
        await tx.update(deals).set({ stage, invoiceId: invoice.id }).where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)));
        return invoice.id;
      });
    } else {
      const updated = await db.update(deals)
        .set({ stage })
        .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
        .returning({ id: deals.id });
      if (updated.length === 0) return { success: false, error: 'Сделката не е от този акаунт.' };
    }

    revalidatePath('/', 'layout');
    return { success: true as const, invoiceNumber, invoiceId };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}
