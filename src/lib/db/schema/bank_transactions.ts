import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { bankAccounts } from './bank_accounts';
import { expenses } from './expenses';

export const bankTransactions = pgTable('bank_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => bankAccounts.id).notNull(),
  transactionId: text('transaction_id').unique(),
  amount: text('amount').notNull(),
  currency: text('currency').default('BGN'),
  date: timestamp('date'),
  description: text('description'),
  counterpartyName: text('counterparty_name'),
  counterpartyIban: text('counterparty_iban'),
  isReconciled: boolean('is_reconciled').default(false),
  matchedExpenseId: uuid('matched_expense_id').references(() => expenses.id), // AI match
  createdAt: timestamp('created_at').defaultNow(),
});
