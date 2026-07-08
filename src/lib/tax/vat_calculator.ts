// Данъчен модул - Изчисляване на ДДС (ЗДДС)
// Логика за генериране на Декларация по чл. 125

import { db } from '@/lib/db/db';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { eq, and, sql } from 'drizzle-orm';

export async function calculateVatReturn(tenantId: string, year: number, month: number) {
  const [agg] = await db
    .select({
      suppliesNet: sql<string>`COALESCE(SUM(CASE WHEN ${vatJournals.type} = 'sales' THEN ${vatJournals.netAmount} ELSE 0 END), 0)`,
      suppliesVat: sql<string>`COALESCE(SUM(CASE WHEN ${vatJournals.type} = 'sales' THEN ${vatJournals.vatAmount} ELSE 0 END), 0)`,
      purchasesNet: sql<string>`COALESCE(SUM(CASE WHEN ${vatJournals.type} = 'purchases' THEN ${vatJournals.netAmount} ELSE 0 END), 0)`,
      purchasesVat: sql<string>`COALESCE(SUM(CASE WHEN ${vatJournals.type} = 'purchases' THEN ${vatJournals.vatAmount} ELSE 0 END), 0)`,
    })
    .from(vatJournals)
    .where(
      and(
        eq(vatJournals.tenantId, tenantId),
        eq(vatJournals.periodYear, year),
        eq(vatJournals.periodMonth, month),
      ),
    );

  const suppliesNet = Number(agg?.suppliesNet) || 0;
  const suppliesVat = Number(agg?.suppliesVat) || 0;
  const purchasesNet = Number(agg?.purchasesNet) || 0;
  const purchasesVat = Number(agg?.purchasesVat) || 0;

  const vatPayable = Math.max(0, suppliesVat - purchasesVat);
  const vatRefundable = Math.max(0, purchasesVat - suppliesVat);

  return {
    period: { month, year },
    tenantId,
    suppliesWithVat: suppliesNet,
    purchasesWithVat: purchasesNet,
    vatOnSales: suppliesVat,
    vatOnPurchases: purchasesVat,
    vatPayable,
    vatRefundable,
  };
}
