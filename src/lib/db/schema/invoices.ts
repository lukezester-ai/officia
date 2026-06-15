import { pgTable, text, timestamp, numeric, uuid, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue']);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  vat: numeric('vat', { precision: 5, scale: 2 }).default('0'),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: invoiceStatusEnum('status').default('draft'),
  pdfUrl: text('pdf_url'),
  aiGenerated: boolean('ai_generated').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
