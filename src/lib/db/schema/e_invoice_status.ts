// @ts-nocheck
import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const eInvoiceStatus = pgTable('e_invoice_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull(), // В реалната система: .references(() => invoices.id)
  napReference: varchar('nap_reference', { length: 50 }), // Референтен номер от НАП
  status: varchar('status', { length: 20 }).notNull(), // pending, accepted, rejected, delivered
  statusCode: varchar('status_code', { length: 10 }), // Код от НАП (0=успех, 1-999=грешка)
  statusMessage: text('status_message'), // Съобщение от НАП
  sentAt: timestamp('sent_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  rejectionReason: text('rejection_reason'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
