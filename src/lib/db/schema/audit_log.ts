import { pgTable, text, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action'), // 'CREATE', 'UPDATE', 'DELETE', 'POST', 'CANCEL'
  tableName: text('table_name'),
  recordId: uuid('record_id'),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// SQL функция за извличане на Одитен Дневник (Audit Trail Report)
export const auditTrailReportSQL = `
CREATE FUNCTION get_audit_trail_report(
  p_tenant_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
) RETURNS TABLE (
  action_time TIMESTAMP,
  user_name TEXT,
  user_email TEXT,
  action VARCHAR,
  table_name VARCHAR,
  record_id UUID,
  changes_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.created_at,
    u.name,
    u.email,
    al.action,
    al.table_name,
    al.record_id,
    CASE 
      WHEN al.action IN ('INSERT', 'UPDATE') THEN 
        (SELECT string_agg(key || ': ' || (value->>0) || ' → ' || (value->>1), ', ')
         FROM jsonb_each_text(al.new_data - al.old_data))
      ELSE 'DELETED'
    END as changes_summary
  FROM audit_log al
  JOIN users u ON al.user_id = u.id
  WHERE al.tenant_id = p_tenant_id
    AND al.created_at BETWEEN p_start_date AND p_end_date
  ORDER BY al.created_at;
END;
$$ LANGUAGE plpgsql;
`;
