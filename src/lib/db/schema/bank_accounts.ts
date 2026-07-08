import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  institutionId: text('institution_id'), // e.g. 'SANDBOXFINANCE_SFIN0000'
  institutionName: text('institution_name'), // e.g. 'UniCredit Bulbank'
  iban: text('iban'),
  balance: numeric('balance', { precision: 15, scale: 2 }),
  currency: text('currency').default('EUR'),
  provider: text('provider').default('manual'),
  externalRequisitionId: text('external_requisition_id'),
  externalAccountId: text('external_account_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
