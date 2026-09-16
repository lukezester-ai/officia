'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { requireTenant } from '@/lib/auth/get-tenant';
import { desc, and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import {
  VAT_PURCHASE_STATUSES,
  VAT_SALES_STATUSES,
  vatLineAmounts,
} from '@/lib/tax/vat-period';

export async function getVatData() {
  try {
    const { tenantId } = await requireTenant();

    const sales = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          inArray(invoices.status, [...VAT_SALES_STATUSES]),
          or(isNull(invoices.type), ne(invoices.type, 'purchase')),
        ),
      )
      .orderBy(desc(invoices.issueDate));

    const purchases = await db
      .select()
      .from(purchaseInvoices)
      .where(
        and(
          eq(purchaseInvoices.tenantId, tenantId),
          inArray(purchaseInvoices.status, [...VAT_PURCHASE_STATUSES]),
        ),
      )
      .orderBy(desc(purchaseInvoices.issueDate));

    const totalVatPurchases = purchases.reduce((sum, i) => sum + vatLineAmounts(i).vat, 0);
    const totalVatSales = sales.reduce((sum, i) => sum + vatLineAmounts(i).vat, 0);
    const netVat = totalVatSales - totalVatPurchases;

    const problems = [];

    for (const inv of sales) {
      if (vatLineAmounts(inv).vat > 0 && !inv.counterpartyEik) {
        problems.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          counterpartyName: inv.counterpartyName,
          issue: 'Начислено ДДС, но липсва ЕИК на контрагента.',
        });
      }
    }

    for (const inv of purchases) {
      if (vatLineAmounts(inv).vat > 0 && !inv.supplierEik) {
        problems.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          counterpartyName: inv.supplierName,
          issue: 'Данъчен кредит, но липсва ЕИК на доставчика.',
        });
      }
    }

    return {
      success: true,
      data: {
        purchases: purchases.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          issueDate: p.issueDate,
          counterpartyName: p.supplierName,
          totalAmount: p.totalAmount,
          vatAmount: p.vatAmount,
        })),
        sales,
        kpi: {
          totalVatPurchases,
          totalVatSales,
          netVat,
        },
        problems,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
