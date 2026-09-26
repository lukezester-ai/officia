import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { invoices } from '@/lib/db/schema/invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { and, eq, inArray } from 'drizzle-orm';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';

const OPEN_INVOICE_STATUSES = ['issued', 'sent', 'overdue'];

export interface MatchSuggestion {
  transaction: {
    id: string;
    amount: string;
    description: string | null;
    counterpartyName: string | null;
  };
  type: 'invoice' | 'expense';
  matchId: string;
  confidence: number;
  reason: string;
  target: any;
}

function cents(value: number) {
  return Math.round(value * 100);
}

export class ReconciliationEngine {
  static async suggestMatches(tenantId: string): Promise<MatchSuggestion[]> {
    if (!tenantId) return [];

    const unreconciled = await db
      .select({
        id: bankTransactions.id,
        amount: bankTransactions.amount,
        description: bankTransactions.description,
        counterpartyName: bankTransactions.counterpartyName,
      })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(
        eq(bankAccounts.tenantId, tenantId),
        eq(bankTransactions.isReconciled, false),
      ));

    const openInvoices = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        inArray(invoices.status, OPEN_INVOICE_STATUSES),
      ));

    const openExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tenantId, tenantId));

    const suggestions: MatchSuggestion[] = [];

    for (const tx of unreconciled) {
      const txAmount = parseFloat(tx.amount || '0');
      if (!Number.isFinite(txAmount) || cents(txAmount) === 0) continue;

      if (txAmount > 0) {
        for (const inv of openInvoices) {
          const invTotal = getInvoiceEffectiveAmount(inv);
          if (cents(invTotal) !== cents(txAmount)) continue;
          const hasInvNumber = Boolean(inv.invoiceNumber && tx.description?.includes(inv.invoiceNumber));
          suggestions.push({
            transaction: tx,
            type: 'invoice',
            matchId: inv.id,
            confidence: hasInvNumber ? 98 : 70,
            reason: hasInvNumber
              ? 'Намерено е съвпадение по сума и номер на фактура'
              : 'Съвпадение само по сума',
            target: {
              ...inv,
              total: invTotal.toFixed(2),
              clientName: inv.clientName || inv.counterpartyName,
            },
          });
        }
      }

      if (txAmount < 0) {
        for (const exp of openExpenses) {
          const expTotal = parseFloat(exp.amount || '0');
          if (cents(expTotal) !== cents(Math.abs(txAmount))) continue;
          suggestions.push({
            transaction: tx,
            type: 'expense',
            matchId: exp.id,
            confidence: 75,
            reason: 'Съвпадение по сума (изходящ превод)',
            target: exp,
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}
