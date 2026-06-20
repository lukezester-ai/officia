import { db } from './db/db';
import { activityLogs } from './db/schema/activity_logs';

export async function logActivity(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details?: string
) {
  try {
    await db.insert(activityLogs).values({
      tenantId,
      userId: userId || null,
      action,
      entityType,
      entityId,
      metaJson: details ? { details } : null,
    });
  } catch (e) {
    console.error('Failed to log activity', e);
  }
}
