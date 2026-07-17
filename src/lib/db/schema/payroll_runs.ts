// @ts-nocheck
import { pgTable, text, timestamp, numeric, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { employees } from './employees';

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  month: text('month').notNull(), // e.g. "Юли" or "07"
  year: integer('year').notNull(), // e.g. 2026
  status: text('status').default('draft'), // draft, approved, paid
  totalGross: numeric('total_gross', { precision: 12, scale: 2 }).default('0'),
  totalNet: numeric('total_net', { precision: 12, scale: 2 }).default('0'),
  totalEmployerCost: numeric('total_employer_cost', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payrollSlipItems = pgTable('payroll_slip_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => payrollRuns.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  grossSalary: numeric('gross_salary', { precision: 10, scale: 2 }).notNull(),
  netSalary: numeric('net_salary', { precision: 10, scale: 2 }).notNull(),
  employeeDoo: numeric('employee_doo', { precision: 10, scale: 2 }).default('0'),
  employeeDzpo: numeric('employee_dzpo', { precision: 10, scale: 2 }).default('0'),
  employeeZo: numeric('employee_zo', { precision: 10, scale: 2 }).default('0'),
  ddfl: numeric('ddfl', { precision: 10, scale: 2 }).default('0'),
  employerDoo: numeric('employer_doo', { precision: 10, scale: 2 }).default('0'),
  employerDzpo: numeric('employer_dzpo', { precision: 10, scale: 2 }).default('0'),
  employerZo: numeric('employer_zo', { precision: 10, scale: 2 }).default('0'),
  totalEmployerCost: numeric('total_employer_cost', { precision: 10, scale: 2 }).notNull(),
  adjustmentsJson: jsonb('adjustments_json'),
  createdAt: timestamp('created_at').defaultNow(),
});
