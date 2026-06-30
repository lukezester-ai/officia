import { generateObject } from 'ai';
import { getAnthropicChatModel } from '../model';
import { z } from 'zod';

export const documentSchema = z.object({
  totalAmount: z.number().describe('The total amount to be paid or total expense amount. Use 0 if not found.'),
  currency: z.string().describe('The currency of the amount, e.g. EUR, BGN, USD. Default to EUR if not specified.'),
  invoiceNumber: z.string().describe('The invoice number or document reference number. Use "Unknown" if not found.'),
  date: z.string().describe('The date of the document in YYYY-MM-DD format. Use "Unknown" if not found.'),
  counterpartyName: z.string().describe('The name of the vendor, supplier, or client issuing the document.'),
  extractedText: z.string().describe('The full raw text extracted from the document, summarizing its contents.'),
});

export async function processDocumentImage(base64Image: string, mimeType: string) {
  const model = getAnthropicChatModel();
  const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');

  const { object } = await generateObject({
    model,
    schema: documentSchema,
    messages: [
      {
        role: 'system',
        content:
          'You are a highly precise OCR and data extraction agent. You will be provided with an image of a document (invoice, receipt, contract). Your task is to extract the requested fields with 100% accuracy. If a field is not present, return a sensible default.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Please extract the data from this document.' },
          {
            type: 'image',
            image: `data:${mimeType || 'image/jpeg'};base64,${cleanBase64}`,
          },
        ],
      },
    ],
  });

  return object;
}

export async function processDocumentText(rawText: string) {
  const model = getAnthropicChatModel();

  const { object } = await generateObject({
    model,
    schema: documentSchema,
    messages: [
      {
        role: 'system',
        content:
          'You extract structured invoice/receipt fields from plain text (often from a PDF). Return accurate fields; use defaults when missing.',
      },
      {
        role: 'user',
        content: `Extract invoice fields from this document text:\n\n${rawText.slice(0, 12000)}`,
      },
    ],
  });

  return object;
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    return parsed.text?.trim() ?? '';
  } catch {
    throw new Error('PDF parsing is unavailable. Upload JPG/PNG or install pdf-parse.');
  }
}
