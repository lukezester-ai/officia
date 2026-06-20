import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

// Example tool: Create Invoice
const createInvoiceTool = tool({
  description: "Създава нова продажна фактура. Използвай този инструмент, когато потребителят иска да издаде фактура.",
  parameters: z.object({
    counterpartyId: z.string().describe("ID на контрагента (клиента)"),
    items: z.array(z.object({
      description: z.string().describe("Описание на стоката/услугата"),
      quantity: z.number().describe("Количество"),
      unitPrice: z.number().describe("Единична цена без ДДС"),
      vatRate: z.number().describe("Данъчна ставка (напр. 20 за стандартна, 0 за ВОД)").optional().default(20),
    })),
    dueDate: z.string().optional().describe("Дата на падеж във формат YYYY-MM-DD"),
    notes: z.string().optional().describe("Допълнителни бележки към фактурата"),
  }),
  execute: async (args: any) => {
    try {
      return {
        success: true,
        message: `Фактурата за контрагент ${args.counterpartyId} е генерирана успешно с ${args.items?.length || 0} артикула.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
} as any);

const tools = {
  createInvoice: createInvoiceTool,
};

export async function runAIAssistant(
  userMessage: string,
  tenantId: string,
  userId: string,
  conversationHistory: any[] = []
) {
  const context = `Ти си Officia AI – интелигентен офис асистент за български фирми.
Бъди полезен, точен и професионален. Отговаряй винаги на български език.
Ако потребителят иска да създаде фактура, събери нужната информация (клиент, артикули, цени) и използвай инструмента createInvoice.
Текуща дата: ${new Date().toISOString()}`;

  try {
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-latest'),
      system: context,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      tools: tools,
    });

    return {
      response: result.text,
      toolCalls: result.toolCalls,
    };
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
}
