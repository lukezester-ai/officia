import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tenantInvites = pgTable('tenant_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
