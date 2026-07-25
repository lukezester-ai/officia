import { db } from '@/lib/db/db';
import { auditLog } from '@/lib/db/schema/audit_log';

export type AiAuditEvent = {
  tenantId: string;
  userId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
  error?: string | null;
};

export async function logAiAction(event: AiAuditEvent) {
  try {
    await db.insert(auditLog).values({
      tenantId: event.tenantId,
      userId: event.userId ?? null,
      action: event.action,
      tableName: event.tableName,
      recordId: event.recordId ?? null,
      newData: event.metadata ? JSON.parse(JSON.stringify(event.metadata)) : null,
      ipAddress: 'ai-agent',
      userAgent: 'officia-ai-agent',
    });
  } catch (err) {
    console.error('[AiAuditLog] Failed to write audit log:', err);
  }
}

export function createToolAuditLogger(tenantId: string, userId: string | null) {
  return {
    log: (action: string, tableName: string, recordId?: string | null, metadata?: Record<string, unknown>, error?: string | null) =>
      logAiAction({ tenantId, userId, action, tableName, recordId, metadata, error }),
  };
}
