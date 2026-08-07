import { pgTable, uuid, varchar, timestamp, text, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const contractStatusEnum = pgEnum('contract_status', ['draft', 'active', 'expired', 'terminated']);

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: contractStatusEnum('status').default('draft').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contractVersions = pgTable('contract_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  versionNumber: varchar('version_number', { length: 50 }).notNull(),
  contentUrl: varchar('content_url', { length: 500 }),
  isCurrent: boolean('is_current').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contractParties = pgTable('contract_parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  partyName: varchar('party_name', { length: 255 }).notNull(),
  partyRole: varchar('party_role', { length: 100 }), // e.g. "Vendor", "Client"
  contactEmail: varchar('contact_email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
