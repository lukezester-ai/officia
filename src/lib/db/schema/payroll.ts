import { boolean, date, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { employees } from './employees';
import { journalHeaders } from './journal_entries';

export const payrollStatusEnum = pgEnum('payroll_status', ['draft', 'posted', 'canceled']);

export const payrollBatches = pgTable('payroll_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  month: date('month').notNull(),
  status: payrollStatusEnum('status').default('draft').notNull(),
  maxInsuranceBase: numeric('max_insurance_base', { precision: 12, scale: 2 }).notNull(),
  employeeInsuranceRate: numeric('employee_insurance_rate', { precision: 6, scale: 3 }).notNull(),
  employerInsuranceRate: numeric('employer_insurance_rate', { precision: 6, scale: 3 }).notNull(),
  incomeTaxRate: numeric('income_tax_rate', { precision: 6, scale: 3 }).notNull(),
  totalGross: numeric('total_gross', { precision: 15, scale: 2 }).default('0').notNull(),
  totalEmployeeInsurance: numeric('total_employee_insurance', { precision: 15, scale: 2 }).default('0').notNull(),
  totalEmployerInsurance: numeric('total_employer_insurance', { precision: 15, scale: 2 }).default('0').notNull(),
  totalTax: numeric('total_tax', { precision: 15, scale: 2 }).default('0').notNull(),
  totalNet: numeric('total_net', { precision: 15, scale: 2 }).default('0').notNull(),
  totalEmployerCost: numeric('total_employer_cost', { precision: 15, scale: 2 }).default('0').notNull(),
  journalHeaderId: uuid('journal_header_id').references(() => journalHeaders.id),
  createdBy: uuid('created_by').references(() => users.id),
  postedBy: uuid('posted_by').references(() => users.id),
  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantMonthIdx: uniqueIndex('payroll_batches_tenant_month_idx').on(table.tenantId, table.month),
}));

export const payrollItems = pgTable('payroll_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').references(() => payrollBatches.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  employeeName: text('employee_name').notNull(),
  position: text('position'),
  baseSalary: numeric('base_salary', { precision: 12, scale: 2 }).notNull(),
  workingDays: integer('working_days').notNull(),
  workedDays: integer('worked_days').notNull(),
  bonus: numeric('bonus', { precision: 12, scale: 2 }).default('0').notNull(),
  otherTaxable: numeric('other_taxable', { precision: 12, scale: 2 }).default('0').notNull(),
  otherDeductions: numeric('other_deductions', { precision: 12, scale: 2 }).default('0').notNull(),
  gross: numeric('gross', { precision: 12, scale: 2 }).notNull(),
  insuranceBase: numeric('insurance_base', { precision: 12, scale: 2 }).notNull(),
  employeeInsurance: numeric('employee_insurance', { precision: 12, scale: 2 }).notNull(),
  employerInsurance: numeric('employer_insurance', { precision: 12, scale: 2 }).notNull(),
  incomeTax: numeric('income_tax', { precision: 12, scale: 2 }).notNull(),
  net: numeric('net', { precision: 12, scale: 2 }).notNull(),
  employerCost: numeric('employer_cost', { precision: 12, scale: 2 }).notNull(),
  hasWarning: boolean('has_warning').default(false).notNull(),
  warning: text('warning'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  batchEmployeeIdx: uniqueIndex('payroll_items_batch_employee_idx').on(table.batchId, table.employeeId),
}));
