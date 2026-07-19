// @ts-nocheck
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const documentSchema = z.object({
  totalAmount: z.number().describe('The total amount to be paid or total expense amount. Use 0 if not found.'),
  currency: z.string().describe('The currency of the amount, e.g. EUR, USD. Default to EUR if not specified.'),
  invoiceNumber: z.string().describe('The invoice number or document reference number. Use "Unknown" if not found.'),
  date: z.string().describe('The date of the document in YYYY-MM-DD format. Use "Unknown" if not found.'),
  counterpartyName: z.string().describe('The name of the vendor, supplier, or client issuing the document.'),
  extractedText: z.string().describe('The full raw text extracted from the document, summarizing its contents.'),
  lineItems: z.array(
    z.object({
      description: z.string().describe('Description of the item or service'),
      quantity: z.number().describe('Quantity, default to 1 if unspecified'),
      unitPrice: z.number().describe('Unit price before VAT'),
      total: z.number().describe('Total price for this line'),
      itemType: z.enum(['goods', 'service']).describe('AI classification: whether this line item is physical goods (стока) or a service (услуга).'),
    })
  ).default([]).describe('Line items extracted with goods vs service classification for inventory tracking.'),
});

export async function processDocumentImage(base64Image: string, mimeType: string) {
  // Use Claude 3.5 Sonnet for vision tasks
  const model = anthropic('claude-3-5-sonnet-latest');

  // Strip the prefix if present (e.g. data:image/jpeg;base64,)
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const { object } = await generateObject({
    model,
    schema: documentSchema,
    messages: [
      {
        role: 'system',
        content: `You are Officia OCR — a precise Bulgarian accounting document extraction agent.
Rules:
1. Extract every monetary value carefully (totals, VAT, line items). Prefer EUR; if BGN is shown convert only if both are present, otherwise keep the document currency.
2. For Bulgarian invoices capture supplier name, invoice number, and dates in YYYY-MM-DD.
3. Classify each line as goods or service for inventory/accounting handoff.
4. Put the full readable text into extractedText (Bulgarian if the document is Bulgarian).
5. Never invent VAT IDs or amounts that are not visible — use defaults from the schema instead.`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Извлечи структурираните данни от този документ за последващо осчетоводяване и банково съпоставяне.' },
          { type: 'image', image: cleanBase64 }
        ]
      }
    ]
  });

  return object;
}

