import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { invoices } from '@/lib/db/schema/invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { and, eq } from 'drizzle-orm';

type BankTransactionRow = typeof bankTransactions.$inferSelect;
type InvoiceRow = typeof invoices.$inferSelect;
type ExpenseRow = typeof expenses.$inferSelect;

export interface MatchSuggestion {
  transaction: BankTransactionRow;
  type: 'invoice' | 'expense';
  matchId: string | number;
  confidence: number;
  reason: string;
  target: InvoiceRow | ExpenseRow;
}

export class ReconciliationEngine {
  static async suggestMatches(tenantId: string): Promise<MatchSuggestion[]> {
    const unreconciledRows = await db
      .select({ transaction: bankTransactions })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.isReconciled, false)));

    const unreconciled = unreconciledRows.map((row) => row.transaction);

    const openInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'issued')));

    const openExpenses = await db.select().from(expenses).where(eq(expenses.tenantId, tenantId));

    const suggestions: MatchSuggestion[] = [];

    for (const tx of unreconciled) {
      const txAmount = parseFloat(tx.amount || '0');

      if (txAmount > 0) {
        for (const inv of openInvoices) {
          const invTotal = parseFloat(inv.totalAmount || inv.total || '0');
          if (invTotal === txAmount) {
            const hasInvNumber = Boolean(tx.description?.includes(inv.invoiceNumber ?? ''));
            suggestions.push({
              transaction: tx,
              type: 'invoice',
              matchId: inv.id,
              confidence: hasInvNumber ? 98 : 70,
              reason: hasInvNumber
                ? 'Намерено е съвпадение по Сума и Номер на фактура'
                : 'Съвпадение само по Сума',
              target: inv,
            });
          }
        }
      }

      if (txAmount < 0) {
        for (const exp of openExpenses) {
          const expTotal = parseFloat(exp.amount || '0');
          if (expTotal === Math.abs(txAmount)) {
            suggestions.push({
              transaction: tx,
              type: 'expense',
              matchId: exp.id,
              confidence: 75,
              reason: 'Съвпадение по сума (Изходящ превод)',
              target: exp,
            });
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}
