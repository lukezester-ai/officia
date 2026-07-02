import { boolean, date, index, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { employees } from './employees';
import { users } from './users';

export const attendanceTypeEnum = pgEnum('attendance_type', [
  'worked',
  'leave',
  'sick',
  'holiday',
  'overtime',
  'unpaid',
]);

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  hoursWorked: numeric('hours_worked', { precision: 5, scale: 2 }).default('0').notNull(),
  type: attendanceTypeEnum('type').notNull(),
  description: text('description'),
  approved: boolean('approved').default(false).notNull(),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantEmployeeDateIdx: uniqueIndex('attendance_records_tenant_employee_date_idx')
    .on(table.tenantId, table.employeeId, table.date),
  tenantDateIdx: index('attendance_records_tenant_date_idx').on(table.tenantId, table.date),
}));
