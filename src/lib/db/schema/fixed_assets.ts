// @ts-nocheck
import { pgTable, text, uuid, timestamp, numeric, boolean, date } from 'drizzle-orm/pg-core';
import { accountPlan } from './account_plan';

export const fixedAssets = pgTable('fixed_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  inventoryNumber: text('inventory_number').notNull(),
  name: text('name').notNull(),
  acquisitionDate: date('acquisition_date').notNull(),
  acquisitionCost: numeric('acquisition_cost', { precision: 15, scale: 2 }).notNull(),
  salvageValue: numeric('salvage_value', { precision: 15, scale: 2 }).default('0'), // Остатъчна стойност
  usefulLifeMonths: numeric('useful_life_months').notNull(), // Срок на годност в месеци (САП)
  amortizationMethod: text('amortization_method').default('straight_line'), // 'straight_line', 'declining_balance'
  assetAccountId: uuid('asset_account_id').references(() => accountPlan.id), // Сметка за актива (напр. 204)
  amortizationAccountId: uuid('amortization_account_id').references(() => accountPlan.id), // Сметка за натрупана амортизация (напр. 241)
  expenseAccountId: uuid('expense_account_id').references(() => accountPlan.id), // Разходна сметка (напр. 603)
  isActive: boolean('is_active').default(true),
  documentId: uuid('document_id'), // Фактура за придобиване
  aiStatus: text('ai_status'), // warnings (no invoice, fully amortized but active)
  writtenOffAt: timestamp('written_off_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const depreciationRuns = pgTable('depreciation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  month: text('month').notNull(), // e.g. "07"
  year: text('year').notNull(), // e.g. "2026"
  status: text('status').default('completed'), // completed, error
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const depreciationLogs = pgTable('depreciation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').references(() => depreciationRuns.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => fixedAssets.id).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  journalEntryId: uuid('journal_entry_id'), // Връзка към счетоводната статия
  createdAt: timestamp('created_at').defaultNow(),
});
