import { generateObject } from 'ai';
import { getAnthropicChatModel } from '../model';
import { z } from 'zod';

export const documentSchema = z.object({
  totalAmount: z.number().describe('Общата сума за плащане или размерът на разхода. Използвай 0, ако липсва.'),
  currency: z.string().describe('Валутата на сумата, например EUR, BGN или USD. Използвай EUR, ако не е посочена.'),
  invoiceNumber: z.string().describe('Номерът на фактурата или документа. Използвай „Неизвестен“, ако липсва.'),
  date: z.string().describe('Датата на документа във формат YYYY-MM-DD. Използвай „Неизвестна“, ако липсва.'),
  counterpartyName: z.string().describe('Името на доставчика, продавача или клиента, издал документа.'),
  extractedText: z.string().describe('Пълният извлечен текст от документа.'),
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
          'Ти си прецизен агент за разпознаване и извличане на данни. Получаваш изображение на фактура, касова бележка или договор. Извлечи поисканите полета възможно най-точно. Ако поле липсва, върни подходяща стойност по подразбиране.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Извлечи данните от този документ.' },
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
          'Извличаш структурирани полета на фактура или касова бележка от обикновен текст. Върни точни данни и използвай стойности по подразбиране при липсващи полета.',
      },
      {
        role: 'user',
        content: `Извлечи полетата на фактурата от следния текст:\n\n${rawText.slice(0, 12000)}`,
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
    throw new Error('Обработката на PDF не е достъпна. Качете JPG или PNG изображение.');
  }
}
