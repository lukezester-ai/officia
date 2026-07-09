import { eventBus } from './event-bus';
import type { DomainEvent } from './types';
import { runReviewEngineForInvoice } from '@/lib/ai/review-engine';
import { processDocumentForRag } from '@/lib/ai/rag/document-embedder';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { eq, and, sql } from 'drizzle-orm';
import { runMatchEngineForTransaction } from '@/lib/matching/bank-match';

async function handler(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case 'invoice:created':
      await runReviewEngineForInvoice(event.payload.invoiceId);
      break;
    case 'invoice:paid':
      await db
        .update(invoices)
        .set({ status: 'paid' })
        .where(eq(invoices.id, Number(event.payload.invoiceId)));
      break;
    case 'bank:transactions-synced':
      {
        const pending = await db
          .select({ id: bankTransactions.id })
          .from(bankTransactions)
          .where(
            and(
              eq(bankTransactions.accountId, event.payload.accountId),
              sql`${bankTransactions.isReconciled} = false`,
              sql`${bankTransactions.matchedInvoiceId} IS NULL`,
            ),
          )
          .limit(20);
        for (const tx of pending) {
          await runMatchEngineForTransaction(tx.id);
        }
      }
      break;
    case 'document:uploaded':
      await processDocumentForRag(event.payload.documentId, event.tenantId);
      break;
  }
}

export function registerListeners() {
  eventBus.on('invoice:created', handler);
  eventBus.on('invoice:paid', handler);
  eventBus.on('bank:transactions-synced', handler);
  eventBus.on('document:uploaded', handler);
}
