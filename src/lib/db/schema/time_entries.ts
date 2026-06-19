// @ts-nocheck
import { pgTable, timestamp, uuid, text, time, pgEnum } from 'drizzle-orm/pg-core';
import { employees } from './employees';
import { tenants } from './tenants';

export const entryTypeEnum = pgEnum('entry_type', ['check_in', 'check_out', 'break_start', 'break_end']);

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  type: entryTypeEnum('type').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  note: text('note'),
  location: text('location'), // GPS coordinates or IP
});

export const workSchedules = pgTable('work_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  dayOfWeek: text('day_of_week').notNull(), // 'monday', 'tuesday', ...
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isActive: text('is_active').default('true'),
});
