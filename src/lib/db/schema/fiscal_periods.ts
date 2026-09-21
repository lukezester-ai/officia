import { pgTable, text, uuid, timestamp, date, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const fiscalYears = pgTable('fiscal_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  year: integer('year').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').default('open'), // open, closed, locked
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by').references(() => users.id),
});

export const accountingPeriods = pgTable('accounting_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  fiscalYearId: uuid('fiscal_year_id').references(() => fiscalYears.id).notNull(),
  periodNumber: integer('period_number').notNull(), // 1..12
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').default('open'), // open, closed
  lockedAt: timestamp('locked_at'),
});
