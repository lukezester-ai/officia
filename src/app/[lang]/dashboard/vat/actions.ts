'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { requireTenant } from '@/lib/auth/get-tenant';
import { desc, and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { parseUuidParam } from '@/lib/utils/ids';
import { isValidEik } from '@/lib/payroll/declarations';
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
          kind: 'sales' as const,
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
          kind: 'purchase' as const,
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

export async function correctVatEik(kind: 'sales' | 'purchase', invoiceId: string, eik: string) {
  try {
    const { tenantId } = await requireTenant();
    const id = parseUuidParam(invoiceId);
    if (!id || (kind !== 'sales' && kind !== 'purchase')) {
      return { success: false, error: 'Невалидна фактура.' };
    }
    const normalized = eik.replace(/^BG/i, '').trim();
    if (!isValidEik(normalized)) {
      return { success: false, error: 'ЕИК трябва да е 9 цифри с валидна контролна цифра.' };
    }

    if (kind === 'sales') {
      const rows = await db
        .update(invoices)
        .set({ counterpartyEik: normalized, updatedAt: new Date() })
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .returning({ id: invoices.id });
      if (!rows.length) return { success: false, error: 'Фактурата не е намерена.' };
    } else {
      const rows = await db
        .update(purchaseInvoices)
        .set({ supplierEik: normalized, updatedAt: new Date() })
        .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)))
        .returning({ id: purchaseInvoices.id });
      if (!rows.length) return { success: false, error: 'Фактурата не е намерена.' };
    }

    revalidatePath('/', 'layout');
    return { success: true, eik: normalized };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
