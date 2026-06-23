// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { eq, and, or, ilike } from 'drizzle-orm';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildCreateJournalEntryTool = (tenantId: string, userId: string) => tool({
  description: "Създава двустранна счетоводна статия (Journal Entry). Използвай го, когато потребителят иска да осчетоводи нещо (напр. 'осчетоводи наем', 'създай контировка').",
  parameters: z.object({
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
        title: 'Review AI journal entry',
        description: `Proposed journal entry for ${amount}: ${description}`,
        sourceType: 'journal_entry',
        payload: { description, amount, debitAccountCode, creditAccountCode, date },
        summary: {
          debitAccountCode,
          creditAccountCode,
          amount,
          date: date || new Date().toISOString().slice(0, 10),
        },
      });

      const entryDate = date ? new Date(date) : new Date();

      // Помощна функция: намира сметката по номер или име, или я създава
      const getOrCreateAccount = async (codeOrName: string) => {
        let acc = await db.query.accountPlan.findFirst({
          where: and(
            eq(accountPlan.tenantId, tenantId),
            or(
              eq(accountPlan.accountNumber, codeOrName),
              ilike(accountPlan.name, `%${codeOrName}%`)
            )
          )
        });
        
        if (!acc) {
           const isNum = /^\d+$/.test(codeOrName);
           const [newAcc] = await db.insert(accountPlan).values({
             tenantId,
             accountNumber: isNum ? codeOrName : Math.floor(100 + Math.random() * 899).toString(),
             name: isNum ? `Сметка ${codeOrName}` : codeOrName,
             type: 'expense'
           }).returning();
           acc = newAcc;
        }
        return acc;
      };

      const debitAcc = await getOrCreateAccount(debitAccountCode);
      const creditAcc = await getOrCreateAccount(creditAccountCode);

      const randomNum = `JE-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Създаване на Хедър (journal_headers)
      const [header] = await db.insert(journalHeaders).values({
        tenantId,
        journalNumber: randomNum,
        entryDate,
        description,
        postedBy: userId,
        status: 'posted',
        aiStatus: 'verified',
        aiConfidence: '0.90'
      }).returning();

      // 2. Създаване на редове (journal_lines) за Дебит и Кредит
      await db.insert(journalLines).values([
        {
          journalId: header.id,
          accountId: debitAcc.id,
          entryType: 'debit',
          amount: amount.toString(),
          description: description,
        },
        {
          journalId: header.id,
          accountId: creditAcc.id,
          entryType: 'credit',
          amount: amount.toString(),
          description: description,
        }
      ]);

      return {
        success: true,
        journalId: header.id,
        message: `Успешно създадена счетоводна статия #${header.journalNumber}:\n- Дебит: ${debitAcc.accountNumber} ${debitAcc.name} (${amount} лв)\n- Кредит: ${creditAcc.accountNumber} ${creditAcc.name} (${amount} лв)\nОснование: ${description}`
      };
    } catch (err: any) {
      console.error("AI Create Journal Entry Error:", err);
      return { success: false, message: `Грешка при осчетоводяване: ${err.message}` };
    }
  }
});
