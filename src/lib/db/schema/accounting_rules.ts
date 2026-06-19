// @ts-nocheck
import { pgTable, text, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
import { accountPlan } from './account_plan';

export const accountingRules = pgTable('accounting_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  triggerType: text('trigger_type'), // 'invoice.create', 'expense.create', 'payment.receive'
  condition: jsonb('condition'), // например { "status": "paid", "amount": { "gte": 1000 } }
  debitAccountId: uuid('debit_account_id').references(() => accountPlan.id),
  creditAccountId: uuid('credit_account_id').references(() => accountPlan.id),
  isActive: boolean('is_active').default(true),
});
