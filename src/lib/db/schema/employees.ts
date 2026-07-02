import { pgTable, text, timestamp, numeric, uuid, date, boolean, pgEnum, jsonb, uniqueIndex, index, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const contractTypeEnum = pgEnum('contract_type', ['full_time', 'part_time', 'contractor']);

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id), // Optional linked application user
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  personalIdentifierEncrypted: text('personal_identifier_encrypted'),
  personalIdentifierHash: text('personal_identifier_hash'),
  bankIbanEncrypted: text('bank_iban_encrypted'),
  bankName: text('bank_name'),
  position: text('position'),
  department: text('department'),
  birthYear: integer('birth_year'),
  economicActivityCode: text('economic_activity_code'),
  insuranceCategory: text('insurance_category').default('third'),
  minimumInsuranceIncome: numeric('minimum_insurance_income', { precision: 12, scale: 2 }),
  salary: numeric('salary', { precision: 12, scale: 2 }),
  additionalBenefits: jsonb('additional_benefits').default({}),
  contractType: contractTypeEnum('contract_type').default('full_time'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
  workStatus: text('work_status').default('at_work'), // at_work, on_leave, sick_leave, unpaid_leave
  aiStatus: text('ai_status'), // e.g. "missing_contract", "expiring_soon"
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantPersonalIdentifierIdx: uniqueIndex('employees_tenant_personal_identifier_idx')
    .on(table.tenantId, table.personalIdentifierHash),
  tenantStatusIdx: index('employees_tenant_active_idx').on(table.tenantId, table.isActive),
}));
