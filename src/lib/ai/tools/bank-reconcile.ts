import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { and, eq, gte, lte } from 'drizzle-orm';
import { runMatchEngineForTransaction } from '@/lib/matching/bank-match';

export const bankReconcileTool = tool({
  description: "Извършва автоматично равнение (reconciliation) на банкови транзакции със счетоводни записи",
  inputSchema: z.object({
    bankAccountId: z.string().describe("ID на банковата сметка"),
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    }).optional().describe("Период за равнение"),
  }),
  execute: async ({ bankAccountId, dateRange }) => {
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId))
      .limit(1);

    if (!account) {
      return { success: false, message: 'Банковата сметка не е намерена.' };
    }

    const filters = [eq(bankTransactions.accountId, bankAccountId), eq(bankTransactions.isReconciled, false)];
    if (dateRange?.start) {
      filters.push(gte(bankTransactions.date, new Date(dateRange.start)));
    }
    if (dateRange?.end) {
      filters.push(lte(bankTransactions.date, new Date(dateRange.end)));
    }

    const pending = await db.select().from(bankTransactions).where(and(...filters));
    let matched = 0;
    let suggested = 0;
    let unmatched = 0;

    for (const tx of pending) {
      const result = await runMatchEngineForTransaction(tx.id);
      if (result.success && result.autoClosed) matched += 1;
      else if (result.success && result.matchedInvoice) suggested += 1;
      else unmatched += 1;
    }

    return {
      success: true,
      matchedTransactions: matched,
      suggestedTransactions: suggested,
      unmatchedTransactions: unmatched,
      message: `Равнение за сметка ${account.iban || bankAccountId}: ${matched} автоматично свързани, ${suggested} за преглед, ${unmatched} без съвпадение.`,
    };
  },
});
