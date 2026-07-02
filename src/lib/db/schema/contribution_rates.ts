import { date, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const contributionFundEnum = pgEnum('contribution_fund', [
  'doo_pension',
  'doo_ozm',
  'doo_unemployment',
  'health',
  'dzpo',
  'accident',
  'other',
]);

export const contributionPayerEnum = pgEnum('contribution_payer', ['employee', 'employer']);

export const contributionRates = pgTable('contribution_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  employeeDooRate: numeric('employee_doo_rate', { precision: 6, scale: 3 }).notNull(),
  employeeHealthRate: numeric('employee_health_rate', { precision: 6, scale: 3 }).notNull(),
  employeeOtherRate: numeric('employee_other_rate', { precision: 6, scale: 3 }).default('0').notNull(),
  employerDooRate: numeric('employer_doo_rate', { precision: 6, scale: 3 }).notNull(),
  employerHealthRate: numeric('employer_health_rate', { precision: 6, scale: 3 }).notNull(),
  employerOtherRate: numeric('employer_other_rate', { precision: 6, scale: 3 }).default('0').notNull(),
  incomeTaxRate: numeric('income_tax_rate', { precision: 6, scale: 3 }).notNull(),
  minimumWage: numeric('minimum_wage', { precision: 12, scale: 2 }),
  minimumInsuranceIncome: numeric('minimum_insurance_income', { precision: 12, scale: 2 }),
  maxInsuranceBase: numeric('max_insurance_base', { precision: 12, scale: 2 }).notNull(),
  validFrom: date('valid_from').notNull(),
  validTo: date('valid_to'),
  sourceUrl: text('source_url'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantValidityIdx: index('contribution_rates_tenant_validity_idx')
    .on(table.tenantId, table.validFrom, table.validTo),
}));

export const contributionRateComponents = pgTable('contribution_rate_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  contributionRateId: uuid('contribution_rate_id').notNull()
    .references(() => contributionRates.id, { onDelete: 'cascade' }),
  fund: contributionFundEnum('fund').notNull(),
  payer: contributionPayerEnum('payer').notNull(),
  ratePercent: numeric('rate_percent', { precision: 7, scale: 4 }).notNull(),
  appliesTo: text('applies_to').default('all').notNull(),
  economicActivityCode: text('economic_activity_code'),
  insuranceCategory: text('insurance_category'),
  minBase: numeric('min_base', { precision: 12, scale: 2 }),
  maxBase: numeric('max_base', { precision: 12, scale: 2 }),
  sourceUrl: text('source_url'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  rateIdx: index('contribution_rate_components_rate_idx')
    .on(table.contributionRateId, table.payer, table.fund),
  applicabilityIdx: index('contribution_rate_components_applicability_idx')
    .on(table.economicActivityCode, table.insuranceCategory, table.appliesTo),
}));
