// @ts-nocheck
export interface AccountingAnalysisResult {
  invoiceNumber: string;
  issueDate: string;
  supplierName: string;
  supplierEik: string;
  supplierVat: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }[];
  suggestedAccount: string;
  notes: string;
}

import { anthropicClient } from './anthropic-client';
import { z } from 'zod';

// Zod schema matching the TypeScript interface
const AccountingSchema = z.object({
  invoiceNumber: z.string(),
  issueDate: z.string(),
  supplierName: z.string(),
  supplierEik: z.string(),
  supplierVat: z.string(),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      vatRate: z.number(),
    })
  ),
  suggestedAccount: z.string(),
  notes: z.string(),
});

export class AccountingAnalyzer {
  static async analyzeText(text: string): Promise<AccountingAnalysisResult> {
    const prompt = `
Extract the following fields from the Bulgarian invoice text and return them as JSON matching the provided schema:
- invoiceNumber
- issueDate (YYYY-MM-DD)
- supplierName
- supplierEik
- supplierVat
- lines[] { description, quantity, unitPrice, vatRate }
- suggestedAccount (suggested chart-of-accounts code)
- notes (optional free-text)

Invoice text:
"""${text}"""
    `;
    try {
      const result = await anthropicClient.generateObject({
        model: process.env.ANTHROPIC_MODEL,
        schema: AccountingSchema,
        prompt,
      });
      return result as AccountingAnalysisResult;
    } catch (err) {
      console.error('Anthropic call failed', err);
      throw new Error('Анализът на фактурата не успя. Не се връщат измислени данни.');
    }
  }
}
