import { generateObject } from 'ai';
import { getAnthropicChatModel } from '../model';
import { z } from 'zod';

export const matchSchema = z.object({
  matchedId: z
    .string()
    .nullable()
    .describe('Идентификаторът на съвпадащия документ. Върни null, ако няма сигурно съвпадение.'),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Оценка от 0 до 100 за сигурността на съвпадението.'),
  reason: z.string().describe('Кратко обяснение защо е избрано съвпадението или защо липсва такова.'),
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
  const model = getAnthropicChatModel();

  const systemPrompt = `Ти си експертен агент за финансово съгласуване. Съпостави една банкова транзакция със списък от фактури или разходи.
Правила:
1. Сравнявай внимателно сумите. Малки разлики от валутно превалутиране или банкови такси са допустими само при ясно съвпадение на контрагент или номер на документ.
2. При увереност под 85% върни null за matchedId.
3. Отрицателните транзакции обикновено съответстват на разходи, а положителните — на фактури за продажба.
Обясни решението на български.`;

  const { object } = await generateObject({
    model,
    schema: matchSchema,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Транзакция за съпоставяне:\n${JSON.stringify(transaction, null, 2)}\n\nВъзможни документи:\n${JSON.stringify(candidates, null, 2)}\n\nНамери най-доброто съвпадение.`,
      },
    ],
  });

  return object;
}
