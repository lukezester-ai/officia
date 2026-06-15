import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const matchSchema = z.object({
  matchedId: z.string().nullable().describe('The ID of the matched candidate document. Return null if no confident match is found.'),
  confidenceScore: z.number().min(0).max(100).describe('Confidence score from 0 to 100 representing how sure the AI is about the match.'),
  reason: z.string().describe('Short explanation of why this match was chosen or why no match was found.')
});

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
}

export interface Candidate {
  id: string;
  type: 'invoice' | 'expense';
  counterpartyName: string;
  totalAmount: number;
  currency: string;
  documentNumber?: string;
  date?: string;
}

export async function matchTransactionWithAI(transaction: Transaction, candidates: Candidate[]) {
  const model = anthropic('claude-3-5-sonnet-latest');

  const systemPrompt = `You are an expert financial reconciliation AI agent. Your job is to match a single bank transaction against a list of candidate documents (invoices or expenses). 
Follow these strict rules:
1. Compare amounts closely. Minor discrepancies (e.g. currency conversion or bank fees) are acceptable if the description strongly matches the counterparty or document number.
2. If the confidence is below 85%, return null for matchedId.
3. Be careful with directions: negative transaction amounts usually match expenses (supplier invoices), positive transaction amounts match sales invoices.
Provide a clear reason for your decision in Bulgarian language.`;

  const { object } = await generateObject({
    model,
    schema: matchSchema,
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Transaction to match:\n${JSON.stringify(transaction, null, 2)}\n\nCandidates:\n${JSON.stringify(candidates, null, 2)}\n\nPlease find the best match.` 
      }
    ]
  });

  return object;
}
