'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, desc, and } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getVatData() {
  try {
    const { tenantId } = await requireTenant();
    const allInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.issueDate));

    const purchases = allInvoices.filter((i) => i.type === 'purchase');
    const sales = allInvoices.filter((i) => i.type === 'sale' || i.type === 'invoice' || !i.type);

    const totalVatPurchases = purchases.reduce((sum, i) => sum + parseFloat(i.vatAmount || '0'), 0);
    const totalVatSales = sales.reduce((sum, i) => sum + parseFloat(i.vatAmount || '0'), 0);
    const netVat = totalVatSales - totalVatPurchases;

    const problems = [];
    for (const inv of allInvoices) {
      if (parseFloat(inv.vatAmount || '0') > 0 && !inv.counterpartyEik) {
        problems.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          counterpartyName: inv.counterpartyName,
          issue: 'Начислено ДДС, но липсва ЕИК на контрагента.',
        });
      }
    }

    return {
      success: true,
      data: {
        purchases,
        sales,
        kpi: { totalVatPurchases, totalVatSales, netVat },
        problems,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
