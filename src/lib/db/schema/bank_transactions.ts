import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
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
  matchedExpenseId: uuid('matched_expense_id').references(() => expenses.id),
  matchedInvoiceId: uuid('matched_invoice_id').references(() => invoices.id),
  matchStatus: text('match_status').default('unmatched'),
  matchConfidence: text('match_confidence'),
  reviewRequired: boolean('review_required').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
