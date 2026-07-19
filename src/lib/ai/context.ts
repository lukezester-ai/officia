// @ts-nocheck
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { inventoryItems } from '@/lib/db/schema/inventory';

/**
 * Builds live tenant context for the AI assistant / orchestrator.
 */
export async function buildRichContext(tenantId: string, userId: string): Promise<string> {
  const currentDate = new Date().toISOString();

  try {
    const [sales, purchases, accounts, openInbox, pendingLeave, recentJournals, stockItems] = await Promise.all([
      db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt)).limit(50).catch(() => []),
      db.select().from(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId)).limit(50).catch(() => []),
      db.select().from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId)).catch(() => []),
      db
        .select()
        .from(aiInboxItems)
        .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, 'open')))
        .limit(20)
        .catch(() => []),
      db
        .select()
        .from(leaveRequests)
        .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.status, 'pending')))
        .catch(() => []),
      db
        .select()
        .from(journalHeaders)
        .where(eq(journalHeaders.tenantId, tenantId))
        .orderBy(desc(journalHeaders.entryDate))
        .limit(10)
        .catch(() => []),
      db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId)).limit(200).catch(() => []),
    ]);

    const unpaidSales = sales.filter((i) => i.status !== 'paid' && i.type === 'sale');
    const unpaidTotal = unpaidSales.reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
    const draftPurchases = purchases.filter((p) => p.status === 'draft');
    const accountIds = accounts.map((a) => a.id);

    let unreconciledCount = 0;
    if (accountIds.length) {
      const txs = await db
        .select({ id: bankTransactions.id })
        .from(bankTransactions)
        .where(and(inArray(bankTransactions.accountId, accountIds), eq(bankTransactions.isReconciled, false)))
        .catch(() => []);
      unreconciledCount = txs.length;
    }

    const approvalCount = openInbox.filter((i) => i.type === 'ai_approval_required').length;
    const inventorySignals = openInbox.filter((i) => String(i.type || '').startsWith('inventory_')).length;
    const stockCount = stockItems.length;

    return `
Текуща дата: ${currentDate}
Tenant ID: ${tenantId}
User ID: ${userId}
Валута: EUR

Жив бизнес статус:
- Неплатени продажбени фактури: ${unpaidSales.length} бр. / ~${unpaidTotal.toFixed(2)} EUR
- Чернови покупни фактури: ${draftPurchases.length}
- Отворени AI Inbox сигнали: ${openInbox.length} (от тях approvals: ${approvalCount}, склад: ${inventorySignals})
- Несъпоставени банкови транзакции: ${unreconciledCount}
- Чакащи молби за отпуск: ${pendingLeave.length}
- Последни журнални записи: ${recentJournals.length}
- Банкови сметки: ${accounts.length}
- Складови артикули: ${stockCount}

Приоритети за асистента:
1. Ако има approvals > 0 — насочи към AI Inbox / одобрения.
2. Ако има несъпоставени преводи — предложи runBankSync.
3. Ако има чернови покупки — предложи преглед/контировка.
4. Склад: register / receive / issue / scanInventoryCode при баркод.
5. Високорискови записи винаги през човешко одобрение.
`.trim();
  } catch (err: any) {
    console.warn('[buildRichContext] fallback:', err?.message);
    return `
Текуща дата: ${currentDate}
Tenant ID: ${tenantId}
User ID: ${userId}
Валута: EUR
(Контекстът от базата временно не е наличен — работи с инструменти за живи данни.)
`.trim();
  }
}
