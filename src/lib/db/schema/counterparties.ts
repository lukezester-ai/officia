import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const counterparties = pgTable('counterparties', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  type: text('type').notNull().default('client'),
  name: text('name').notNull(),
  eik: text('eik'),
  vatNumber: text('vat_number'),
  address: text('address'),
  city: text('city'),
  email: text('email'),
  phone: text('phone'),
  contactPerson: text('contact_person'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});