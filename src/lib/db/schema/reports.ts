// @ts-nocheck
import { pgTable, text, timestamp, varchar, date, jsonb, uuid } from 'drizzle-orm/pg-core';

export const financialReports = pgTable('financial_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // balance, pnl, cashflow, trial
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: varchar('status', { length: 20 }).default('generated'),
  generatedBy: text('generated_by').notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
  data: jsonb('data').notNull(), // съхраняваме целия отчет като JSON
});
