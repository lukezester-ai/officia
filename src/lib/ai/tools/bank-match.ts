import { z } from 'zod';
import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { eq } from 'drizzle-orm';
import { ReconciliationEngine } from '@/lib/accounting/reconciliation-engine';


function simpleTextSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const intersection = wordsA.filter(word => wordsB.includes(word)).length;
  return intersection / Math.max(wordsA.length, wordsB.length);
}

function calculateMatchScore(tx: any, candidate: any): number {
  let score = 0;

  // Amount
  const candAmount = candidate.type === 'invoice' ? parseFloat(candidate.target.total) : parseFloat(candidate.target.amount);
  const amountDiff = Math.abs(Math.abs(parseFloat(tx.amount)) - Math.abs(candAmount));
  if (amountDiff < 0.01) score += 0.6;
  else if (amountDiff < 5) score += 0.3;

  // Date
  if (candidate.target.date && tx.date) {
    const dateDiff = Math.abs(new Date(tx.date).getTime() - new Date(candidate.target.date).getTime()) / (1000 * 3600 * 24);
    if (dateDiff < 1) score += 0.25;
    else if (dateDiff < 3) score += 0.1;
  }

  // Description
  const candDesc = candidate.target.description || candidate.target.invoiceNumber || '';
  const descSimilarity = simpleTextSimilarity(tx.description || '', candDesc);
  score += descSimilarity * 0.15;

  return Math.min(score, 1.0);
}

export const bankMatchTool = {
  description: "Съпоставя банкови транзакции с фактури или разходи чрез AI. Използвай го, когато потребителят иска да съпостави (reconcile) банкови транзакции.",
  parameters: z.object({
    bankTransactionId: z.string().describe("ID на банковата транзакция за съпоставяне"),
    confidenceThreshold: z.number().default(0.75).describe("Минимален праг на увереност (0 до 1)"),
  }),
  execute: async (args: { bankTransactionId: string, confidenceThreshold?: number }) => {
    try {
      const { bankTransactionId, confidenceThreshold = 0.75 } = args;
      
      const txs = await db.select().from(bankTransactions).where(eq(bankTransactions.id, bankTransactionId));
      const tx = txs[0];

      if (!tx) {
        return { success: false, message: "Транзакцията не е намерена" };
      }
      
      const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.id, tx.accountId));
      const tenantId = accounts.length > 0 ? accounts[0].tenantId : 'default';

      // 1. Използваме съществуващия ReconciliationEngine
      const candidates = await ReconciliationEngine.suggestMatches(tenantId || 'default');
      
      // 2. Филтрираме само кандидатите за тази транзакция и добавяме AI scoring
      const relevantCandidates = candidates.filter(c => c.transaction.id === tx.id);
      
      const scoredCandidates = relevantCandidates.map(candidate => ({
        ...candidate,
        score: calculateMatchScore(tx, candidate),
      })).filter(c => c.score >= confidenceThreshold)
        .sort((a, b) => b.score - a.score);

      if (scoredCandidates.length > 0) {
        const best = scoredCandidates[0];
        
        // В реално приложение тук ще отбележим транзакцията като съпоставена в базата данни:
        await db.update(bankTransactions).set({ isReconciled: true }).where(eq(bankTransactions.id, tx.id));
        
        return {
          success: true,
          matchedWith: best.target,
          type: best.type,
          confidence: best.score,
          message: `Успешно съпоставено с ${best.type} #${best.matchId} (${(best.score * 100).toFixed(1)}% увереност)`
        };
      }

      return {
        success: false,
        candidates: scoredCandidates.length > 0 ? scoredCandidates : relevantCandidates,
        message: "Няма достатъчно добро съвпадение. Моля, съпостави ръчно."
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
