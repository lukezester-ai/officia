import { pgTable, text, timestamp, numeric, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  category: text('category'),
  expenseDate: timestamp('expense_date').notNull(),
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at').defaultNow(),
});
