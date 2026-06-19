// @ts-nocheck
import { pgTable, text, uuid, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accountPlan } from './account_plan';
import { companyDivisions } from './company_structure';
import { projects } from './projects';

export const entryTypeEnum = pgEnum('entry_type', ['debit', 'credit']);
export const journalStatusEnum = pgEnum('journal_status', ['draft', 'posted', 'canceled']);

export const journalHeaders = pgTable('journal_headers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  journalNumber: text('journal_number').unique().notNull(), // Напр. YYYY-NNNNN
  entryDate: timestamp('entry_date').notNull(),
  description: text('description'),
  documentType: text('document_type'), // invoice, expense, payment
  documentId: uuid('document_id'), // Референция към фактура/документ
  status: journalStatusEnum('status').default('draft'),
  postedBy: uuid('posted_by').references(() => users.id),
  postedAt: timestamp('posted_at'),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  hash: text('hash'), // Криптографски хеш на статията
  previousHash: text('previous_hash'), // Верига (Blockchain-like)
  timestampToken: text('timestamp_token'), // Токен от TSA (Time Stamping Authority)
  createdAt: timestamp('created_at').defaultNow(),
});

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').references(() => journalHeaders.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accountPlan.id).notNull(),
  entryType: entryTypeEnum('entry_type').notNull(), // debit / credit
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  analyticalCode: text('analytical_code'), // Напр. ЕИК на клиент/доставчик
  divisionId: uuid('division_id').references(() => companyDivisions.id),
  projectId: uuid('project_id').references(() => projects.id),
  currency: text('currency').default('BGN'),
  exchangeRate: numeric('exchange_rate', { precision: 15, scale: 6 }).default('1.000000'),
  description: text('description'),
  vatCode: text('vat_code'), // напр. '20', '9', '0'
  createdAt: timestamp('created_at').defaultNow(),
});
