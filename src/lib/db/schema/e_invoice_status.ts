import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { invoices } from './invoices';

export const eInvoiceStatus = pgTable('e_invoice_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  napReference: varchar('nap_reference', { length: 50 }),
  status: varchar('status', { length: 20 }).notNull(),
  statusCode: varchar('status_code', { length: 10 }),
  statusMessage: text('status_message'),
  sentAt: timestamp('sent_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  rejectionReason: text('rejection_reason'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
