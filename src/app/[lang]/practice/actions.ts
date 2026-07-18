'use server';

import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, sql } from 'drizzle-orm';
import { predict30DayCashflow } from '@/lib/ai/cashflow-predictor';

export async function getPracticeOverview() {
  try {
    // В реална среда тук се прави проверка дали потребителят има роля "Агенция/Админ"
    // За MVP взимаме всички фирми в системата
    const allTenants = await db.select().from(tenants);
    
    const overviewData = [];

    for (const t of allTenants) {
      // Брой отворени AI Аномалии
      const alertsResult = await db.select({ count: sql<number>`count(*)` })
        .from(aiInboxItems)
        .where(
          sql`${aiInboxItems.tenantId} = ${t.id} AND ${aiInboxItems.status} = 'open'`
        );
      const alertsCount = alertsResult[0]?.count || 0;

      // Брой чакащи фактури (draft/pending)
      const invoicesResult = await db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(
          sql`${invoices.tenantId} = ${t.id} AND ${invoices.status} = 'draft'`
        );
      const pendingInvoices = invoicesResult[0]?.count || 0;

      // Cashflow Прогноза (Healthy, Warning, Critical)
      const cashflowRes = await predict30DayCashflow(t.id);
      let cashflowStatus = 'unknown';
      if (cashflowRes.success && cashflowRes.data) {
        cashflowStatus = cashflowRes.data.status;
      }

      overviewData.push({
        id: t.id,
        name: t.name,
        bulstat: t.bulstat,
        alertsCount,
        pendingInvoices,
        cashflowStatus
      });
    }

    return { success: true, data: overviewData };
  } catch (error: any) {
    console.error('[Practice Overview Error]', error);
    return { success: false, error: error.message };
  }
}
