// @ts-nocheck
import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { createAutoPostings } from '@/lib/accounting/auto-postings';
import { eq } from 'drizzle-orm';

/**
 * Automatically closes (marks as 'paid') the related Sales Invoice, Purchase Invoice, or Expense
 * when a Bank Transaction is matched or reconciled, and triggers the corresponding bank double-entry posting.
 */
export async function autoCloseMatchedDocument(transactionId: string): Promise<{ success: boolean; closedType?: string; closedId?: string; error?: string }> {
  try {
    const [tx] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, transactionId));
    if (!tx) return { success: false, error: 'Транзакцията не е намерена' };

    let closedType: string | undefined;
    let closedId: string | undefined;

    // 1. Check if matched to Sales Invoice
    if (tx.matchedInvoiceId) {
      const invId = String(tx.matchedInvoiceId);
      await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, invId as any));
      closedType = 'invoice';
      closedId = invId;

      // Trigger double-entry accounting: DR 503 Bank / CR 411 Clients
      if (tx.accountId) {
        await createAutoPostings({
          type: 'bank_debit',
          tenantId: (tx as any).tenantId || '00000000-0000-0000-0000-000000000000',
          amount: Math.abs(parseFloat(tx.amount || '0')),
          reference: `BANK-TX-${tx.id}`,
          description: `Плащане по фактура № ${closedId}: ${tx.counterpartyName || tx.description}`,
          date: tx.date ? new Date(tx.date) : new Date(),
        });
      }
    }

    // 2. Check if matched to Purchase Invoice / Expense
    if (tx.matchedExpenseId) {
      const expId = String(tx.matchedExpenseId);
      // Try updating purchaseInvoices first
      try {
        await db.update(purchaseInvoices).set({ status: 'paid' }).where(eq(purchaseInvoices.id, expId as any));
      } catch (e) {
        // ignore
      }
      // Try updating expenses
      try {
        await db.update(expenses).set({ status: 'paid' as any }).where(eq(expenses.id, expId as any));
      } catch (e) {
        // ignore
      }

      closedType = 'expense_or_purchase';
      closedId = expId;

      // Trigger double-entry accounting: DR 401 Suppliers / CR 503 Bank
      if (tx.accountId) {
        await createAutoPostings({
          type: 'bank_credit',
          tenantId: (tx as any).tenantId || '00000000-0000-0000-0000-000000000000',
          amount: Math.abs(parseFloat(tx.amount || '0')),
          reference: `BANK-TX-${tx.id}`,
          description: `Плащане към доставчик: ${tx.counterpartyName || tx.description}`,
          date: tx.date ? new Date(tx.date) : new Date(),
        });
      }
    }

    // Ensure transaction itself is marked reconciled
    await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, transactionId));

    return { success: true, closedType, closedId };
  } catch (error: any) {
    console.error('[autoCloseMatchedDocument] Error:', error);
    return { success: false, error: error.message };
  }
}
