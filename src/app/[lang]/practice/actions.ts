'use server';

import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, sql } from 'drizzle-orm';
import { predict30DayCashflow } from '@/lib/ai/cashflow-predictor';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getPracticeOverview() {
  try {
    const { tenantId } = await requireTenant();
    const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!t) return { success: false, error: 'Липсва tenant' };

    const alertsResult = await db.select({ count: sql<number>`count(*)` })
      .from(aiInboxItems)
      .where(sql`${aiInboxItems.tenantId} = ${t.id} AND ${aiInboxItems.status} = 'open'`);
    const invoicesResult = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(sql`${invoices.tenantId} = ${t.id} AND ${invoices.status} = 'draft'`);

    const cashflowRes = await predict30DayCashflow(t.id);
    let cashflowStatus = 'unknown';
    if (cashflowRes.success && cashflowRes.data) {
      cashflowStatus = cashflowRes.data.status;
    }

    return {
      success: true,
      data: [{
        id: t.id,
        name: t.name,
        bulstat: t.bulstat,
        alertsCount: alertsResult[0]?.count || 0,
        pendingInvoices: invoicesResult[0]?.count || 0,
        cashflowStatus
      }]
    };
  } catch (error: any) {
    console.error('[Practice Overview Error]', error);
    return { success: false, error: error.message };
  }
}
