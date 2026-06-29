import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { expenses } from '@/lib/db/schema/expenses';

export const buildCreateExpenseTool = (tenantId: string, userId: string) => tool({
  description: "Отчита нов фирмен разход (касова бележка, гориво, консумативи, абонаменти и др.). Използвай го задължително, когато потребителят прикачи снимка на касова бележка или директно поиска да се запише разход.",
  inputSchema: z.object({
    description: z.string().describe("Описание на разхода (напр. 'Гориво Shell', 'Офис столове', 'Абонамент')"),
    amount: z.number().describe("Обща сума на разхода"),
    category: z.string().describe("Категория (напр. 'Транспорт', 'Офис', 'Софтуер', 'Услуги', 'Други')"),
    expenseDate: z.string().optional().describe("Дата на разхода във формат YYYY-MM-DD. Ако не е подадена в текста/бележката, използвай днешна дата."),
  }),
  execute: async ({ description, amount, category, expenseDate }) => {
    try {
      const dateToUse = expenseDate ? new Date(expenseDate) : new Date();
      
      const [newExpense] = await db.insert(expenses).values({
        tenantId,
        userId,
        description,
        amount: amount.toString(),
        category,
        expenseDate: dateToUse,
      }).returning();

      return {
        success: true,
        expenseId: newExpense.id,
        message: `Успешно отчетох разход: "${description}" на стойност ${amount.toFixed(2)} лв. в категория "${category}" (Дата: ${dateToUse.toISOString().split('T')[0]}).`,
      };
    } catch (err: any) {
      console.error("AI Create Expense Error:", err);
      return {
        success: false,
        message: `Възникна грешка при записването на разхода: ${err.message}`
      };
    }
  },
});
