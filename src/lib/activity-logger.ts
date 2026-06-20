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
      userId: userId || 'system',
      action,
      entityType,
      entityId,
      details,
    });
  } catch (e) {
    console.error('Failed to log activity', e);
  }
}
