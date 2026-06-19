import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  institutionId: text('institution_id'), // e.g. 'SANDBOXFINANCE_SFIN0000'
  institutionName: text('institution_name'), // e.g. 'UniCredit Bulbank'
  iban: text('iban'),
  balance: text('balance'),
  currency: text('currency').default('EUR'),
  createdAt: timestamp('created_at').defaultNow(),
});
