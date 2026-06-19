// @ts-nocheck
import { pgTable, text, uuid, timestamp, numeric, date } from 'drizzle-orm/pg-core';

export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  currencyFrom: text('currency_from').notNull(), // напр. 'USD', 'EUR'
  currencyTo: text('currency_to').notNull(),     // напр. 'BGN'
  rateDate: date('rate_date').notNull(),         // Дата на курса (напр. по фиксинг на БНБ)
  rate: numeric('rate', { precision: 15, scale: 6 }).notNull(), // Валутен курс
  createdAt: timestamp('created_at').defaultNow(),
});
