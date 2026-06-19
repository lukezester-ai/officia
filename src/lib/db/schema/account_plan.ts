// @ts-nocheck
import { pgTable, text, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';

export const accountPlan = pgTable('account_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  accountNumber: text('account_number').notNull(), // 101, 201, 301...
  parentId: uuid('parent_id'), // за йерархия
  name: text('name').notNull(), // "Каса", "Доставчици", "ДДС"
  type: text('type'), // "asset", "liability", "income", "expense", "equity"
  isActive: boolean('is_active').default(true),
  isAnalytical: boolean('is_analytical').default(false), // Аналитичност (например 201.1, 201.2)
  standard: text('standard').default('NSU'), // НСУ, МСС, etc.
  createdAt: timestamp('created_at').defaultNow(),
});
