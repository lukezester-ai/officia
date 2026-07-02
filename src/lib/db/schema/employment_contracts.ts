import { date, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { employees } from './employees';
import { documents } from './documents';
import { users } from './users';

export const employmentContractKindEnum = pgEnum('employment_contract_kind', [
  'permanent',
  'fixed_term',
  'civil_contract',
]);
export const employmentContractStatusEnum = pgEnum('employment_contract_status', [
  'draft',
  'active',
  'expired',
  'terminated',
]);

export const employmentContracts = pgTable('employment_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  contractNumber: text('contract_number').notNull(),
  kind: employmentContractKindEnum('kind').notNull(),
  contractDate: date('contract_date').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  documentId: uuid('document_id').references(() => documents.id),
  signedAt: timestamp('signed_at'),
  status: employmentContractStatusEnum('status').default('draft').notNull(),
  terms: jsonb('terms').default({}),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantContractNumberIdx: uniqueIndex('employment_contracts_tenant_number_idx')
    .on(table.tenantId, table.contractNumber),
  tenantEmployeeIdx: index('employment_contracts_tenant_employee_idx')
    .on(table.tenantId, table.employeeId),
}));
