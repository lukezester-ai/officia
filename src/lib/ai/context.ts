import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { invoices } from '@/lib/db/schema/invoices';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { and, eq, inArray, sql } from 'drizzle-orm';

export type TenantAiSnapshot = {
  outstandingInvoices: number;
  pendingLeaveRequests: number;
  openInboxItems: number;
  summaryText: string;
};

export async function buildTenantAiSnapshot(tenantId: string): Promise<TenantAiSnapshot> {
  try {
    const [invoiceStats, pendingLeaves, openInbox] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            inArray(invoices.status, ['issued', 'sent', 'overdue', 'partial']),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.status, 'pending'))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(aiInboxItems)
        .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, 'open'))),
    ]);

    const outstandingInvoices = Number(invoiceStats[0]?.count ?? 0);
    const pendingLeaveRequests = Number(pendingLeaves[0]?.count ?? 0);
    const openInboxItems = Number(openInbox[0]?.count ?? 0);

    const parts: string[] = [];
    if (outstandingInvoices > 0) {
      parts.push(`${outstandingInvoices} неплатени/активни фактури`);
    }
    if (pendingLeaveRequests > 0) {
      parts.push(`${pendingLeaveRequests} чакащи молби за отпуск`);
    }
    if (openInboxItems > 0) {
      parts.push(`${openInboxItems} отворени inbox известия`);
    }

    const summaryText =
      parts.length > 0
        ? `Снимка на фирмата: ${parts.join('; ')}.`
        : 'Снимка на фирмата: няма налични броячи от базата (или данните са празни).';

    return {
      outstandingInvoices,
      pendingLeaveRequests,
      openInboxItems,
      summaryText,
    };
  } catch (error) {
    console.error('buildTenantAiSnapshot error:', error);
    return {
      outstandingInvoices: 0,
      pendingLeaveRequests: 0,
      openInboxItems: 0,
      summaryText: 'Снимка на фирмата: неуспешно зареждане от базата.',
    };
  }
}

export async function buildRichContext(tenantId: string, userId: string): Promise<string> {
  const snapshot = await buildTenantAiSnapshot(tenantId);

  return [
    `Дата: ${new Date().toISOString()}`,
    `Tenant ID: ${tenantId}`,
    `User ID: ${userId}`,
    snapshot.summaryText,
  ].join('\n');
}
