// @ts-nocheck
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bulstat: text('bulstat').unique(),
  vatNumber: text('vat_number'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
});
