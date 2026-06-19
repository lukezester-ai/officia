// @ts-nocheck
import { pgTable, text, uuid, timestamp, numeric } from 'drizzle-orm/pg-core';
import { accountPlan } from './account_plan';
import { companyDivisions } from './company_structure';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  year: numeric('year').notNull(),
  month: numeric('month'), // Ако е null, значи е годишен бюджет
  accountId: uuid('account_id').references(() => accountPlan.id), // Може да е празно, ако е бюджет за цялата дивизия
  divisionId: uuid('division_id').references(() => companyDivisions.id), // Разходен център
  plannedAmount: numeric('planned_amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
