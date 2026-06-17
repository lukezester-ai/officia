import { pgTable, uuid, text, numeric, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { counterparties } from './counterparties';

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  counterpartyId: uuid('counterparty_id').references(() => counterparties.id),
  invoiceNumber: text('invoice_number').notNull(),
  type: text('type').notNull().default('invoice'),
  status: text('status').notNull().default('draft'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date'),
  counterpartyName: text('counterparty_name').notNull(),
  counterpartyEik: text('counterparty_eik'),
  counterpartyVat: text('counterparty_vat'),
  counterpartyAddress: text('counterparty_address'),
  netAmount: numeric('net_amount', { precision: 12, scale: 2 }).default('0'),
  vatAmount: numeric('vat_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  notes: text('notes'),
  vatPosted: boolean('vat_posted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoiceLines = pgTable('invoice_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).default('1'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0'),
  vatRate: integer('vat_rate').default(20),
  lineNet: numeric('line_net', { precision: 12, scale: 2 }).default('0'),
  lineVat: numeric('line_vat', { precision: 12, scale: 2 }).default('0'),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }).default('0'),
});