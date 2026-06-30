import { db } from '@/lib/db/db';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { and, eq } from 'drizzle-orm';
import { createAutoPostings } from '@/lib/accounting/auto-postings';
import { ensureStandardAccounts } from '@/lib/accounting/standard-accounts';

export type InvoicePostingSource = 'sales_invoice' | 'purchase_invoice';

export function salesJournalRef(invoiceId: number): string {
  return `SINV-${invoiceId}`;
}

export function purchaseJournalRef(invoiceId: string): string {
  return `PINV-${invoiceId}`;
}

function parseAmount(value: string | null | undefined): number {
  const n = parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

async function isJournalRefTaken(tenantId: string, journalNumber: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: journalHeaders.id })
    .from(journalHeaders)
    .where(and(eq(journalHeaders.tenantId, tenantId), eq(journalHeaders.journalNumber, journalNumber)))
    .limit(1);

  return Boolean(existing);
}

export async function postSalesInvoiceToJournal(
  tenantId: string,
  userId: string,
  invoiceId: number,
): Promise<{ success: true; journalHeaderId: string; journalNumber: string } | { success: false; error: string }> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

  if (!invoice) return { success: false, error: 'Фактурата не е намерена' };
  if (invoice.status === 'draft' || invoice.status === 'cancelled') {
    return { success: false, error: 'Само издадени фактури могат да се осчетоводят' };
  }

  const journalNumber = salesJournalRef(invoiceId);
  if (await isJournalRefTaken(tenantId, journalNumber)) {
    return { success: false, error: 'Фактурата вече е осчетоводена' };
  }

  const totalAmount = parseAmount(invoice.totalAmount);
  const netAmount = parseAmount(invoice.netAmount) || totalAmount - parseAmount(invoice.vatAmount);
  const vatAmount = parseAmount(invoice.vatAmount);

  if (totalAmount <= 0) {
    return { success: false, error: 'Невалидна сума на фактурата' };
  }

  await ensureStandardAccounts(tenantId);

  const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
  const counterparty = invoice.counterpartyName || invoice.clientName || 'Клиент';

  const result = await createAutoPostings({
    type: 'sales_invoice',
    tenantId,
    amount: totalAmount,
    vatAmount,
    reference: journalNumber,
    description: `Продажба — фактура ${invoice.invoiceNumber} (${counterparty})`,
    date: issueDate,
    documentType: 'sales_invoice',
    postedBy: userId,
    aiStatus: 'verified',
    aiConfidence: '0.95',
    aiReasoning: 'Стандартна контировка: Дт 411 / Кт 701 + 4532',
  });

  if (!result) {
    return { success: false, error: 'Неуспешно създаване на журнален запис' };
  }

  return {
    success: true,
    journalHeaderId: result.journalHeaderId,
    journalNumber: result.journalNumber,
  };
}

export async function postPurchaseInvoiceToJournal(
  tenantId: string,
  userId: string,
  invoiceId: string,
): Promise<{ success: true; journalHeaderId: string; journalNumber: string } | { success: false; error: string }> {
  const [invoice] = await db
    .select()
    .from(purchaseInvoices)
    .where(and(eq(purchaseInvoices.id, invoiceId), eq(purchaseInvoices.tenantId, tenantId)));

  if (!invoice) return { success: false, error: 'Фактурата не е намерена' };
  if (invoice.status !== 'approved' && invoice.status !== 'paid') {
    return { success: false, error: 'Само одобрени фактури за покупка могат да се осчетоводят' };
  }

  const journalNumber = purchaseJournalRef(invoiceId);
  if (await isJournalRefTaken(tenantId, journalNumber)) {
    return { success: false, error: 'Фактурата вече е осчетоводена' };
  }

  const totalAmount = parseAmount(invoice.totalAmount);
  const vatAmount = parseAmount(invoice.vatAmount);

  if (totalAmount <= 0) {
    return { success: false, error: 'Невалидна сума на фактурата' };
  }

  await ensureStandardAccounts(tenantId);

  const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();

  const result = await createAutoPostings({
    type: 'purchase_invoice',
    tenantId,
    amount: totalAmount,
    vatAmount,
    reference: journalNumber,
    description: `Покупка — фактура ${invoice.invoiceNumber} (${invoice.supplierName})`,
    date: issueDate,
    documentType: 'purchase_invoice',
    postedBy: userId,
    aiStatus: 'verified',
    aiConfidence: '0.95',
    aiReasoning: 'Стандартна контировка: Дт 601 + 4531 / Кт 401',
  });

  if (!result) {
    return { success: false, error: 'Неуспешно създаване на журнален запис' };
  }

  return {
    success: true,
    journalHeaderId: result.journalHeaderId,
    journalNumber: result.journalNumber,
  };
}

export async function getPostedJournalRefs(tenantId: string): Promise<Set<string>> {
  const rows = await db
    .select({ journalNumber: journalHeaders.journalNumber })
    .from(journalHeaders)
    .where(eq(journalHeaders.tenantId, tenantId));

  return new Set(rows.map((row) => row.journalNumber));
}

export type PendingAccountingItem = {
  id: string;
  source: InvoicePostingSource;
  invoiceNumber: string;
  counterpartyName: string;
  issueDate: string | null;
  totalAmount: string;
  suggestedAccount: string;
  suggestedAccountName: string;
  reasoning: string;
  detailHref: string;
};

export async function getPendingAccountingItems(
  tenantId: string,
  lang: string,
): Promise<PendingAccountingItem[]> {
  const postedRefs = await getPostedJournalRefs(tenantId);
  const items: PendingAccountingItem[] = [];

  const salesInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));

  for (const inv of salesInvoices) {
    if (inv.status === 'draft' || inv.status === 'cancelled') continue;
    if (postedRefs.has(salesJournalRef(inv.id))) continue;

    items.push({
      id: String(inv.id),
      source: 'sales_invoice',
      invoiceNumber: inv.invoiceNumber || `#${inv.id}`,
      counterpartyName: inv.counterpartyName || inv.clientName || '—',
      issueDate: inv.issueDate,
      totalAmount: inv.totalAmount || '0',
      suggestedAccount: '411',
      suggestedAccountName: 'Клиенти',
      reasoning: 'Продажба: Дт 411 / Кт 701 + ДДС 4532',
      detailHref: `/${lang}/dashboard/invoices?open=${inv.id}`,
    });
  }

  const purchases = await db
    .select()
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.tenantId, tenantId));

  for (const inv of purchases) {
    if (inv.status !== 'approved' && inv.status !== 'paid') continue;
    if (postedRefs.has(purchaseJournalRef(inv.id))) continue;

    items.push({
      id: inv.id,
      source: 'purchase_invoice',
      invoiceNumber: inv.invoiceNumber,
      counterpartyName: inv.supplierName,
      issueDate: inv.issueDate,
      totalAmount: inv.totalAmount,
      suggestedAccount: '601',
      suggestedAccountName: 'Разходи за материали',
      reasoning: 'Покупка: Дт 601 + ДДС 4531 / Кт 401',
      detailHref: `/${lang}/dashboard/purchase-invoices`,
    });
  }

  return items.sort((a, b) => {
    const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
    const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
    return db - da;
  });
}
