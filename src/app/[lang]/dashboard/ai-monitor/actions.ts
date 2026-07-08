'use server';

import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { activityLogs } from '@/lib/db/schema/activity_logs';
import { tasks } from '@/lib/db/schema/tasks';
import { desc, eq, and, sql, count } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getAiMonitoringData() {
  try {
    const { tenantId } = await requireTenant();

    const inboxCounts = await db
      .select({
        status: aiInboxItems.status,
        type: aiInboxItems.type,
        count: count(),
      })
      .from(aiInboxItems)
      .where(eq(aiInboxItems.tenantId, tenantId))
      .groupBy(aiInboxItems.status, aiInboxItems.type);

    const openInbox = inboxCounts.filter((r) => r.status === 'open');
    const openTotal = openInbox.reduce((s, r) => s + Number(r.count), 0);
    const anomalyCount = inboxCounts
      .filter((r) => (r.type === 'duplicate_warning' || r.type === 'missing_data') && r.status === 'open')
      .reduce((s, r) => s + Number(r.count), 0);

    const pendingTasks = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'suggested')));

    const totalTasks = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    const recentActivity = await db
      .select({
        id: activityLogs.id,
        entityType: activityLogs.entityType,
        action: activityLogs.action,
        metaJson: activityLogs.metaJson,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(eq(activityLogs.tenantId, tenantId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(20);

    const recentInboxItems = await db
      .select({
        id: aiInboxItems.id,
        type: aiInboxItems.type,
        title: aiInboxItems.title,
        description: aiInboxItems.description,
        priority: aiInboxItems.priority,
        confidence: aiInboxItems.confidence,
        status: aiInboxItems.status,
        createdAt: aiInboxItems.createdAt,
      })
      .from(aiInboxItems)
      .where(eq(aiInboxItems.tenantId, tenantId))
      .orderBy(desc(aiInboxItems.createdAt))
      .limit(10);

    return {
      success: true,
      data: {
        openInboxCount: openTotal,
        anomalyCount,
        pendingTasksCount: Number(pendingTasks[0]?.count || 0),
        totalTasksCount: Number(totalTasks[0]?.count || 0),
        inboxByStatus: inboxCounts.reduce((acc: Record<string, number>, r) => {
          const key = r.status || 'unknown';
          acc[key] = (acc[key] || 0) + Number(r.count);
          return acc;
        }, {} as Record<string, number>),
        inboxByType: inboxCounts.reduce((acc: Record<string, { open: number; total: number }>, r) => {
          const t = r.type || 'unknown';
          if (!acc[t]) acc[t] = { open: 0, total: 0 };
          acc[t].total += Number(r.count);
          if (r.status === 'open') acc[t].open += Number(r.count);
          return acc;
        }, {} as Record<string, { open: number; total: number }>),
        recentActivity,
        recentInboxItems,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
