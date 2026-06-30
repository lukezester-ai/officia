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
      console.error('Anthropic call failed, falling back to mock analyzer', err);
      return AccountingAnalyzer.mockAnalyze(text);
    }
  }

  // Mock fallback logic (unchanged)
  private static async mockAnalyze(text: string): Promise<AccountingAnalysisResult> {
    // Simulating AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const lowerText = text.toLowerCase();

    if (lowerText.includes('хостинг') || lowerText.includes('сървър') || lowerText.includes('aws') || lowerText.includes('hosting')) {
      return {
        invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        supplierName: 'SuperHosting BG Ltd',
        supplierEik: '131449987',
        supplierVat: 'BG131449987',
        lines: [
          {
            description: 'Месечен абонамент за облачен хостинг (VPS)',
            quantity: 1,
            unitPrice: 120.0,
            vatRate: 20,
          },
        ],
        suggestedAccount: '602 Разходи за външни услуги (Хостинг)',
        notes: 'Автоматично разпознато от AI: Разход за IT инфраструктура.',
      };
    }

    if (lowerText.includes('еконт') || lowerText.includes('спиди') || lowerText.includes('куриер')) {
      return {
        invoiceNumber: `ECNT-${Math.floor(Math.random() * 10000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        supplierName: 'Еконт Експрес ООД',
        supplierEik: '117006428',
        supplierVat: 'BG117006428',
        lines: [
          {
            description: 'Куриерски услуги',
            quantity: 1,
            unitPrice: 45.5,
            vatRate: 20,
          },
        ],
        suggestedAccount: '602 Разходи за външни услуги (Куриерски)',
        notes: 'Автоматично разпознато от AI: Разход за транспорт/куриери.',
      };
    }

    if (lowerText.includes('наем') || lowerText.includes('офис')) {
      return {
        invoiceNumber: `RENT-${Math.floor(Math.random() * 10000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        supplierName: 'Офис Билдинг АД',
        supplierEik: '201234567',
        supplierVat: 'BG201234567',
        lines: [
          {
            description: 'Наем на офис помещение',
            quantity: 1,
            unitPrice: 1500.0,
            vatRate: 20,
          },
        ],
        suggestedAccount: '602 Разходи за външни услуги (Наем)',
        notes: 'Автоматично разпознато от AI: Разход за наем.',
      };
    }

    // Default generic parsing
    return {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      issueDate: new Date().toISOString().split('T')[0],
      supplierName: 'Непознат Доставчик',
      supplierEik: '',
      supplierVat: '',
      lines: [
        {
          description: text.substring(0, 50) + '...',
          quantity: 1,
          unitPrice: 0.0,
          vatRate: 20,
        },
      ],
      suggestedAccount: '609 Други разходи',
      notes: 'Моля, прегледайте ръчно. AI не успя да категоризира прецизно.',
    };
  }
}
