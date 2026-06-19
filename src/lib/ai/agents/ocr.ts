// @ts-nocheck
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const documentSchema = z.object({
  totalAmount: z.number().describe('The total amount to be paid or total expense amount. Use 0 if not found.'),
  currency: z.string().describe('The currency of the amount, e.g. BGN, EUR, USD. Default to BGN if not specified.'),
  invoiceNumber: z.string().describe('The invoice number or document reference number. Use "Unknown" if not found.'),
  date: z.string().describe('The date of the document in YYYY-MM-DD format. Use "Unknown" if not found.'),
  counterpartyName: z.string().describe('The name of the vendor, supplier, or client issuing the document.'),
  extractedText: z.string().describe('The full raw text extracted from the document, summarizing its contents.')
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
        content: 'You are a highly precise OCR and data extraction agent. You will be provided with an image of a document (invoice, receipt, contract). Your task is to extract the requested fields with 100% accuracy. If a field is not present, return a sensible default.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Please extract the data from this document.' },
          { type: 'image', image: cleanBase64 }
        ]
      }
    ]
  });

  return object;
}
