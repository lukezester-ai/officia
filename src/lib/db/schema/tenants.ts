import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bulstat: text('bulstat').unique(),
  vatNumber: text('vat_number'),
  address: text('address'),
  plan: text('plan').notNull().default('starter'),
  subscriptionStatus: text('subscription_status').notNull().default('trialing'),
  trialEndsAt: timestamp('trial_ends_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
