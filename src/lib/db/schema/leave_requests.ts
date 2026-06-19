// @ts-nocheck
import { pgTable, text, timestamp, uuid, date, pgEnum } from 'drizzle-orm/pg-core';
import { employees } from './employees';
import { users } from './users';
import { tenants } from './tenants';

export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected']);
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'unpaid', 'other']);

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: leaveTypeEnum('type').notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
