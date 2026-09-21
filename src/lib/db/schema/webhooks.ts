import { pgTable, uuid, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  url: text('url').notNull(),
  events: text('events').array().notNull(), // ['invoice.created', 'journal.posted', 'vat.return.due']
  secret: text('secret').notNull(),
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastSuccessAt: timestamp('last_success_at'),
  failureCount: integer('failure_count').default(0),
});
