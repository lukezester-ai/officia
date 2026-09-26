import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const bankLinks = pgTable('bank_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  reference: text('reference').notNull(),
  requisitionId: text('requisition_id').notNull(),
  institutionId: text('institution_id').notNull(),
  institutionName: text('institution_name'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
