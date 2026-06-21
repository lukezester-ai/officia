import { NextRequest } from 'next/server';
import { streamText, tool, appendResponseMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { bankMatchTool } from '@/lib/ai/tools/bank-match';

// Dummy tool as example
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
    return {
      success: true,
      message: `Фактурата за контрагент ${args.counterpartyId} е генерирана успешно с ${args.items?.length || 0} артикула.`,
    };
  },
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    const context = `Ти си Officia AI – интелигентен офис асистент за български фирми.
Бъди полезен, точен и професионален. Отговаряй винаги на български език.
Можеш да четеш фактури, касови бележки и други документи, ако потребителят ги прикачи. 
Когато извличаш данни от документ, форматирай ги прегледно.
Текуща дата: ${new Date().toISOString()}`;

    const result = streamText({
      model: anthropic('claude-3-5-sonnet-latest'),
      system: context,
      messages: messages,
      tools: {
        createInvoice: createInvoiceTool,
        bankMatch: bankMatchTool,
      },
      maxSteps: 5,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(error.message || "Failed to process chat", { status: 500 });
  }
}
