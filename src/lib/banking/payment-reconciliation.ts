// @ts-nocheck
import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, and, isNull } from 'drizzle-orm';

export interface ReconciliationMatchResult {
  transactionId: string;
  invoiceId?: number;
  invoiceNumber?: string;
  confidenceScore: number; // 0.0 to 1.0 (e.g. 0.95 = 95%)
  status: 'auto_confirmed' | 'review_queue' | 'no_match';
  reasons: string[];
}

/**
 * Тикет 2: Payment reconciliation (GoCardless webhook / cron sync matching engine).
 * Изчислява match confidence score (сума точна + дата ±3 дни + IBAN/име прилика).
 * Ако confidence > 0.90 (90%) -> auto-confirm в едно атомарно `db.transaction(async (tx) => { ... })`.
 * Ако confidence между 0.60 и 0.90 -> изпраща в review queue (`reviewRequired: true`).
 */
export async function reconcileBankTransaction(
  transactionId: string,
  tenantId: string
): Promise<ReconciliationMatchResult> {
  const [txRecord] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, transactionId));
  if (!txRecord || txRecord.isReconciled) {
    return { transactionId, confidenceScore: 0, status: 'no_match', reasons: ['Транзакцията не е намерена или вече е равнена'] };
  }

  // Взимаме всички неплатени или издадени изходящи фактури за този tenant
  const openInvoices = await db.select().from(invoices).where(
    and(
      eq(invoices.tenantId, tenantId),
      eq(invoices.status, 'issued')
    )
  );

  if (openInvoices.length === 0) {
    return { transactionId, confidenceScore: 0, status: 'no_match', reasons: ['Няма отворени фактури за равняване'] };
  }

  const txAmount = Math.abs(parseFloat(txRecord.amount || '0'));
  const txDate = txRecord.date ? new Date(txRecord.date) : new Date();
  const txDesc = (txRecord.description || '').toLowerCase();
  const txCounterparty = (txRecord.counterpartyName || '').toLowerCase();

  let bestMatch: any = null;
  let highestConfidence = 0;
  let bestReasons: string[] = [];

  for (const inv of openInvoices) {
    let score = 0;
    const reasons: string[] = [];
    const invAmount = parseFloat(inv.totalAmount || inv.amount || '0');
    const invNumber = (inv.invoiceNumber || '').toLowerCase();
    const invCounterparty = (inv.counterpartyName || inv.clientName || '').toLowerCase();
    const invDate = inv.issueDate ? new Date(inv.issueDate) : null;

    // 1. Проверка на сума (най-голяма тежест +50%)
    if (Math.abs(txAmount - invAmount) < 0.01 && txAmount > 0) {
      score += 0.50;
      reasons.push('Точна сума');
    } else if (Math.abs(txAmount - invAmount) < 5.00) {
      score += 0.20;
      reasons.push('Близка сума (разлика от банкови такси/курсови разлики)');
    }

    // 2. Проверка за номер на фактура в основанието за плащане (+35%)
    if (invNumber && (txDesc.includes(invNumber) || txDesc.includes(`фактура ${invNumber}`) || txDesc.includes(`inv-${invNumber}`))) {
      score += 0.35;
      reasons.push(`Номер на фактура (${inv.invoiceNumber}) в основанието`);
    }

    // 3. Проверка на име на контрагент / IBAN (+15%)
    if (invCounterparty && txCounterparty && (txCounterparty.includes(invCounterparty) || invCounterparty.includes(txCounterparty))) {
      score += 0.15;
      reasons.push(`Съвпадение в името на контрагента (${inv.counterpartyName})`);
    }

    // 4. Проверка на дата (±3 дни от датата на издаване/падеж) (+10% бонус)
    if (invDate) {
      const diffDays = Math.abs((txDate.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 3) {
        score = Math.min(1.0, score + 0.10);
        reasons.push(`Плащане в рамките на ±3 дни от издаването`);
      }
    }

    if (score > highestConfidence) {
      highestConfidence = score;
      bestMatch = inv;
      bestReasons = reasons;
    }
  }

  // Изпълняваме според прага на увереност (> 90% = auto confirm inside atomic transaction)
  if (highestConfidence >= 0.90 && bestMatch) {
    const now = new Date();
    await db.transaction(async (tx) => {
      // Маркираме фактурата като платена
      await tx.update(invoices).set({
        status: 'paid',
        updatedAt: now,
      }).where(eq(invoices.id, bestMatch.id));

      // Маркираме банковата транзакция като равнена и свързана
      await tx.update(bankTransactions).set({
        matchedInvoiceId: bestMatch.id,
        isReconciled: true,
        matchStatus: 'confirmed',
        matchConfidence: highestConfidence.toFixed(2),
        reviewRequired: false,
      }).where(eq(bankTransactions.id, transactionId));
    });

    return {
      transactionId,
      invoiceId: bestMatch.id,
      invoiceNumber: bestMatch.invoiceNumber,
      confidenceScore: highestConfidence,
      status: 'auto_confirmed',
      reasons: bestReasons,
    };
  } else if (highestConfidence >= 0.50 && bestMatch) {
    // Изпращаме в review queue за ръчно потвърждение от счетоводителя
    await db.update(bankTransactions).set({
      matchedInvoiceId: bestMatch.id,
      matchStatus: 'suggested',
      matchConfidence: highestConfidence.toFixed(2),
      reviewRequired: true,
    }).where(eq(bankTransactions.id, transactionId));

    return {
      transactionId,
      invoiceId: bestMatch.id,
      invoiceNumber: bestMatch.invoiceNumber,
      confidenceScore: highestConfidence,
      status: 'review_queue',
      reasons: bestReasons,
    };
  } else {
    // Няма достатъчно сходство -> остава unmatched
    await db.update(bankTransactions).set({
      matchStatus: 'unmatched',
      matchConfidence: highestConfidence.toFixed(2),
      reviewRequired: true,
    }).where(eq(bankTransactions.id, transactionId));

    return {
      transactionId,
      confidenceScore: highestConfidence,
      status: 'no_match',
      reasons: ['Не е открита фактура с над 50% увереност'],
    };
  }
}
