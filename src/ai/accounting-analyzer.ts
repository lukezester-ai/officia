import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

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
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Анализът на фактурата не е конфигуриран (ANTHROPIC_API_KEY).');
    }
    const { object } = await generateObject({
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'),
      schema: AccountingSchema,
      prompt: `Extract invoice fields from this Bulgarian invoice text as JSON.
Invoice text:
"""${text}"""`,
    });
    return object;
  }
}
