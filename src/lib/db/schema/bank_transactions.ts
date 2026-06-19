// @ts-nocheck
import { pgTable, text, timestamp, uuid, boolean, integer } from 'drizzle-orm/pg-core';
import { bankAccounts } from './bank_accounts';
import { expenses } from './expenses';
import { invoices } from './invoices';

export const bankTransactions = pgTable('bank_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => bankAccounts.id).notNull(),
  transactionId: text('transaction_id').unique(),
  amount: text('amount').notNull(),
  currency: text('currency').default('EUR'),
  date: timestamp('date'),
  description: text('description'),
  counterpartyName: text('counterparty_name'),
  counterpartyIban: text('counterparty_iban'),
  isReconciled: boolean('is_reconciled').default(false),
  matchedExpenseId: uuid('matched_expense_id').references(() => expenses.id), // AI match for outgoing
  matchedInvoiceId: integer('matched_invoice_id').references(() => invoices.id), // AI match for incoming
  createdAt: timestamp('created_at').defaultNow(),
});
