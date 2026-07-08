import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const purchaseInvoices = pgTable('purchase_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  supplierName: text('supplier_name').notNull(),
  supplierEik: text('supplier_eik'),
  supplierVat: text('supplier_vat'),
  supplierAddress: text('supplier_address'),
  status: text('status').notNull().default('draft'),
  netAmount: text('net_amount').notNull().default('0'),
  vatAmount: text('vat_amount').notNull().default('0'),
  totalAmount: text('total_amount').notNull().default('0'),
  vatPosted: boolean('vat_posted').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const purchaseInvoiceLines = pgTable('purchase_invoice_lines', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  description: text('description').notNull(),
  quantity: text('quantity').notNull().default('1'),
  unitPrice: text('unit_price').notNull().default('0'),
  vatRate: integer('vat_rate').notNull().default(20),
  lineNet: text('line_net').notNull().default('0'),
  lineVat: text('line_vat').notNull().default('0'),
  lineTotal: text('line_total').notNull().default('0'),
  lineOrder: integer('line_order').notNull().default(0),
});