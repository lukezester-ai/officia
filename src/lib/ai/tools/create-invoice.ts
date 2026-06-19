// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';

export const createInvoiceTool = tool({
  description: "Създава нова продажна фактура към клиент",
  parameters: z.object({
    customerId: z.string().describe("ID на клиента"),
    items: z.array(z.object({
      description: z.string().describe("Описание на артикула или услугата"),
      quantity: z.number().describe("Количество"),
      unitPrice: z.number().describe("Единична цена без ДДС"),
    })).describe("Списък с артикули"),
    dueDate: z.string().optional().describe("Дата на падеж във формат YYYY-MM-DD"),
    notes: z.string().optional().describe("Допълнителни бележки към фактурата"),
  }),
  execute: async ({ customerId, items, dueDate, notes }) => {
    // TODO: Интеграция с реалния сървиз за създаване на фактури
    console.log("Creating invoice:", { customerId, items, dueDate, notes });
    
    // Mock response
    return {
      success: true,
      invoiceId: `inv_${Math.random().toString(36).substring(7)}`,
      number: `2024-${Math.floor(Math.random() * 1000)}`,
      message: `Фактурата беше създадена успешно.`,
    };
  },
});
