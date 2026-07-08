import { pgTable, text, uuid, timestamp, numeric, date, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const taxDeclarations = pgTable('tax_declarations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'dds', 'profit_tax'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: text('status').default('draft'), // draft, submitted, approved
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }),
  data: jsonb('data').notNull(), // пълни данни за декларацията (JSON)
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
