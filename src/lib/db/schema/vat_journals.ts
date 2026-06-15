import { pgTable, text, uuid, timestamp, numeric, date, integer, boolean } from 'drizzle-orm/pg-core';

export const vatJournals = pgTable('vat_journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  type: text('type').notNull(), // 'sales' (Дневник продажби), 'purchases' (Дневник покупки)
  periodYear: integer('period_year').notNull(),
  periodMonth: integer('period_month').notNull(),
  entryDate: date('entry_date').notNull(),
  documentNumber: text('document_number'),
  counterpartyName: text('counterparty_name'),
  counterpartyVat: text('counterparty_vat'),
  invoiceNumber: text('invoice_number'),
  invoiceDate: date('invoice_date'),
  netAmount: numeric('net_amount', { precision: 15, scale: 2 }),
  vatAmount: numeric('vat_amount', { precision: 15, scale: 2 }),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }),
  vatRate: integer('vat_rate'), // 20, 9, 0 (Освободени)
  isIntraCommunity: boolean('is_intra_community').default(false), // ВОД/ВОП
  createdAt: timestamp('created_at').defaultNow(),
});
