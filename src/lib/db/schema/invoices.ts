import { pgTable, text, numeric, timestamp, jsonb, uuid, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  // Internal users.id — not Clerk's user_… string
  userId: uuid('user_id').references(() => users.id),
  invoiceNumber: text('invoice_number'),
  type: text('type'),
  clientName: text('client_name'),
  counterpartyName: text('counterparty_name'),
  clientAddress: text('client_address'),
  counterpartyAddress: text('counterparty_address'),
  clientVatNumber: text('client_vat_number'),
  counterpartyEik: text('counterparty_eik'),
  counterpartyVat: text('counterparty_vat'),
  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  status: text('status').default('draft'),
  notes: text('notes'),
  items: jsonb('items').default([]),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0'),
  netAmount: numeric('net_amount', { precision: 12, scale: 2 }).default('0'),
  vatAmount: numeric('vat_amount', { precision: 12, scale: 2 }).default('0'),
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).default('0'),
  vatPosted: boolean('vat_posted').default(false),
  aiStatus: text('ai_status'),
  aiConfidence: numeric('ai_confidence', { precision: 3, scale: 2 }),
  matchedTransactionId: uuid('matched_transaction_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paymentUrl: text('payment_url'),
  reviewStatus: text('review_status').default('pending'),
  einvoiceStatus: text('einvoice_status').default('pending'),
  errorReason: text('error_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invoiceLines = pgTable('invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description'),
  quantity: numeric('quantity'),
  unitPrice: numeric('unit_price'),
  vatRate: numeric('vat_rate'),
  lineNet: numeric('line_net'),
  lineVat: numeric('line_vat'),
  lineTotal: numeric('line_total'),
  skladItemId: uuid('sklad_item_id'),
});
