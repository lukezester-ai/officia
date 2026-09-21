import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { invoices } from '@/lib/db/schema/invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { eq } from 'drizzle-orm';

export interface MatchSuggestion {
  transaction: any;
  type: 'invoice' | 'expense';
  matchId: string;
  confidence: number;
  reason: string;
  target: any;
}

export class ReconciliationEngine {
  static async suggestMatches(tenantId: string): Promise<MatchSuggestion[]> {
    // 1. Fetch unreconciled transactions
    const unreconciled = await db.select().from(bankTransactions).where(eq(bankTransactions.isReconciled, false));
    const openInvoices = await db.select().from(invoices).where(eq(invoices.status, 'draft'));
    const openExpenses = await db.select().from(expenses).where(eq(expenses.tenantId, tenantId));

    const suggestions: MatchSuggestion[] = [];

    for (const tx of unreconciled) {
      const txAmount = parseFloat(tx.amount || '0');
      
      // Match incoming (invoices)
      if (txAmount > 0) {
        for (const inv of openInvoices) {
          const invTotal = parseFloat(inv.total || '0');
          if (invTotal === txAmount) {
            const hasInvNumber = Boolean(inv.invoiceNumber && tx.description?.includes(inv.invoiceNumber));
            suggestions.push({
              transaction: tx,
              type: 'invoice',
              matchId: inv.id,
              confidence: hasInvNumber ? 98 : 70,
              reason: hasInvNumber ? 'Намерено е съвпадение по Сума и Номер на фактура' : 'Съвпадение само по Сума',
              target: inv
            });
          }
        }
      }
      
      // Match outgoing (expenses)
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
              target: exp
            });
          }
        }
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}
