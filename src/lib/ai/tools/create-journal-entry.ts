import { tool } from 'ai';
import { z } from 'zod';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildCreateJournalEntryTool = (tenantId: string, userId: string) => tool({
  description: "Създава двустранна счетоводна статия (Journal Entry). Използвай го, когато потребителят иска да осчетоводи нещо (напр. 'осчетоводи наем', 'създай контировка').",
  inputSchema: z.object({
    description: z.string().describe("Описание на стопанската операция (напр. 'Наем за м. Май')"),
    amount: z.number().describe("Сума на операцията"),
    debitAccountCode: z.string().describe("Счетоводна сметка за Дебит (напр. '602' или 'Разходи за външни услуги')"),
    creditAccountCode: z.string().describe("Счетоводна сметка за Кредит (напр. '503' или 'Банкова сметка')"),
    date: z.string().optional().describe("Дата на операцията (YYYY-MM-DD). Ако липсва, ползвай днес."),
  }),
  execute: async ({ description, amount, debitAccountCode, creditAccountCode, date }) => {
    try {
      return await queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'createJournalEntry',
        risk: 'high',
        title: 'Преглед на предложена счетоводна статия',
        description: `Предложена счетоводна статия за ${amount}: ${description}`,
        sourceType: 'journal_entry',
        payload: { description, amount, debitAccountCode, creditAccountCode, date },
        summary: {
          debitAccountCode,
          creditAccountCode,
          amount,
          date: date || new Date().toISOString().slice(0, 10),
        },
      });
    } catch (err: any) {
      console.error("AI Create Journal Entry Error:", err);
      return { success: false, message: `Грешка при осчетоводяване: ${err.message}` };
    }
  }
});
