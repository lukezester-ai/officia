import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { and, eq, gte, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';

/** Statuses that belong in the sales VAT journal (draft/cancelled excluded). */
export const VAT_SALES_STATUSES = ['issued', 'paid', 'accounted', 'sent'] as const;

/** Statuses that belong in the purchase VAT journal. */
export const VAT_PURCHASE_STATUSES = ['approved', 'paid'] as const;

export type VatAmountFields = {
  netAmount?: string | null;
  vatAmount?: string | null;
  totalAmount?: string | null;
  subtotal?: string | null;
  total?: string | null;
  amount?: string | null;
};

export function vatPeriodBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function vatLineAmounts(row: VatAmountFields) {
  const net = parseFloat(String(row.netAmount ?? row.subtotal ?? '0')) || 0;
  const vat = parseFloat(String(row.vatAmount ?? '0')) || 0;
  const storedGross =
    parseFloat(String(row.totalAmount ?? row.total ?? row.amount ?? '0')) || 0;
  const fallbackGross = getInvoiceEffectiveAmount(row);
  const gross = storedGross > 0 ? storedGross : (net + vat > 0 ? net + vat : fallbackGross);
  return {
    net: net > 0 ? net : Math.max(0, gross - vat),
    vat,
    gross,
  };
}

export async function fetchVatPeriodDocuments(tenantId: string, start: string, end: string) {
  if (!tenantId) {
    throw new Error('ДДС справката изисква tenant.');
  }

  const sales = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        inArray(invoices.status, [...VAT_SALES_STATUSES]),
        or(isNull(invoices.type), ne(invoices.type, 'purchase')),
        gte(invoices.issueDate, start),
        lte(invoices.issueDate, end),
      ),
    );

  const purchases = await db
    .select()
    .from(purchaseInvoices)
    .where(
      and(
        eq(purchaseInvoices.tenantId, tenantId),
        inArray(purchaseInvoices.status, [...VAT_PURCHASE_STATUSES]),
        gte(purchaseInvoices.issueDate, start),
        lte(purchaseInvoices.issueDate, end),
      ),
    );

  const salesTotals = sales.reduce(
    (acc, row) => {
      const a = vatLineAmounts(row);
      acc.net += a.net;
      acc.vat += a.vat;
      acc.gross += a.gross;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 },
  );

  const purchaseTotals = purchases.reduce(
    (acc, row) => {
      const a = vatLineAmounts(row);
      acc.net += a.net;
      acc.vat += a.vat;
      acc.gross += a.gross;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 },
  );

  return { sales, purchases, salesTotals, purchaseTotals };
}
