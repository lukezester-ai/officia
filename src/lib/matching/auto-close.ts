import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { createAutoPostings } from '@/lib/accounting/auto-postings';
import { and, eq } from 'drizzle-orm';

export async function autoCloseMatchedDocument(transactionId: string): Promise<{ success: boolean; closedType?: string; closedId?: string; error?: string }> {
  try {
    const [tx] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, transactionId));
    if (!tx) return { success: false, error: 'Транзакцията не е намерена' };

    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, tx.accountId)).limit(1);
    if (!account?.tenantId) {
      return { success: false, error: 'Банковата сметка няма tenant. Отказвам осчетоводяване.' };
    }
    const tenantId = account.tenantId;

    let closedType: string | undefined;
    let closedId: string | undefined;

    if (tx.matchedInvoiceId) {
      const invId = String(tx.matchedInvoiceId);
      const updated = await db.update(invoices).set({ status: 'paid' }).where(and(
        eq(invoices.id, invId),
        eq(invoices.tenantId, tenantId),
      )).returning({ id: invoices.id });
      if (updated.length === 0) {
        return { success: false, error: 'Фактурата не принадлежи на този tenant.' };
      }
      closedType = 'invoice';
      closedId = invId;

      const posted = await createAutoPostings({
        type: 'bank_debit',
        tenantId,
        amount: Math.abs(parseFloat(tx.amount || '0')),
        reference: `BANK-TX-${tx.id}`.slice(0, 40),
        description: `Плащане по фактура № ${closedId}: ${tx.counterpartyName || tx.description}`,
        date: tx.date ? new Date(tx.date) : new Date(),
        documentId: invId,
      });
      if (!posted.success) return posted;
    }

    if (tx.matchedExpenseId) {
      const expId = String(tx.matchedExpenseId);
      const [purchase] = await db.update(purchaseInvoices).set({ status: 'paid' }).where(and(
        eq(purchaseInvoices.id, expId),
        eq(purchaseInvoices.tenantId, tenantId),
      )).returning({ id: purchaseInvoices.id });
      if (!purchase) {
        const [expense] = await db.select({ id: expenses.id }).from(expenses).where(and(
          eq(expenses.id, expId),
          eq(expenses.tenantId, tenantId),
        )).limit(1);
        if (!expense) {
          return { success: false, error: 'Разходът/покупката не принадлежи на този tenant.' };
        }
      }
      closedType = 'expense_or_purchase';
      closedId = expId;

      const posted = await createAutoPostings({
        type: 'bank_credit',
        tenantId,
        amount: Math.abs(parseFloat(tx.amount || '0')),
        reference: `BANK-TX-${tx.id}`.slice(0, 40),
        description: `Плащане към доставчик: ${tx.counterpartyName || tx.description}`,
        date: tx.date ? new Date(tx.date) : new Date(),
        documentId: expId,
      });
      if (!posted.success) return posted;
    }

    await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, transactionId));

    return { success: true, closedType, closedId };
  } catch (error: any) {
    console.error('[autoCloseMatchedDocument] Error:', error);
    return { success: false, error: error.message };
  }
}
