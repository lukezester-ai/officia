import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { counterparties } from './counterparties';
import { tenants } from './tenants';

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  counterpartyId: uuid('counterparty_id').references(() => counterparties.id),
  title: text('title').notNull(),
  amount: text('amount').notNull(),
  currency: text('currency').default('EUR'),
  stage: text('stage').notNull().default('lead'),
  expectedClose: text('expected_close'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
