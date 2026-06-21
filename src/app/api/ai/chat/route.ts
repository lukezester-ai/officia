import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { bankMatchTool } from '@/lib/ai/tools/bank-match';
import { requireTenant } from '@/lib/auth/get-tenant';

// Прост in-memory rate limiter за MVP (в production се ползва Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 минута
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_TEXT_LENGTH = 15000; // 15,000 символа за защита на AI кредити

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
  // @ts-expect-error AI SDK tool execute type might not match
  execute: async (args: any) => {
    return {
      success: true,
      message: `Фактурата за контрагент ${args.counterpartyId} е генерирана успешно с ${args.items?.length || 0} артикула.`,
    };
  },
});

export async function POST(req: NextRequest) {
  try {
    // 1. Автентикация и Авторизация (Workspace/Tenant валидация)
    // requireTenant() гарантира, че потребителят е логнат И има активен Tenant.
    const { userId, tenantId } = await requireTenant();

    // 2. Rate Limiting (Ограничаване на заявките)
    const now = Date.now();
    const rateLimitInfo = rateLimitMap.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    
    if (now > rateLimitInfo.resetTime) {
      rateLimitInfo.count = 1;
      rateLimitInfo.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      rateLimitInfo.count++;
    }
    rateLimitMap.set(userId, rateLimitInfo);

    if (rateLimitInfo.count > MAX_REQUESTS_PER_WINDOW) {
      return new Response("Too many requests. Please try again later.", { status: 429 });
    }

    // 3. Парсване и валидация на входа (Ограничаване на дължината)
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages payload", { status: 400 });
    }

    // Изчисляваме общата дължина на текста от всички съобщения (защита от дълги текстове)
    let totalLength = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        totalLength += msg.content.length;
      }
    }

    if (totalLength > MAX_TEXT_LENGTH) {
      return new Response(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`, { status: 413 });
    }

    // 4. Извикване на AI-то с контекст за фирмата
    const context = `Ти си Officia AI – интелигентен офис асистент за български фирми.
Идентификатор на текущата фирма (Tenant ID): ${tenantId}
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
      }
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    if (error.message === 'Not authenticated' || error.message === 'User not found in local database' || error.message === 'User does not belong to any tenant') {
      return new Response("Forbidden or Unauthorized", { status: 403 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
