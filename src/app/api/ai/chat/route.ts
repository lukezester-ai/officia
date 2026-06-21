import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { buildBankMatchTool } from '@/lib/ai/tools/bank-match';
import { requireTenant } from '@/lib/auth/get-tenant';

// Прост in-memory rate limiter за MVP (в production се ползва Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 минута
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_TEXT_LENGTH = 15000; // 15,000 символа за защита на AI кредити

import { buildCreateInvoiceTool } from '@/lib/ai/tools/create-invoice';
import { buildGetFinancialSummaryTool } from '@/lib/ai/tools/get-financial-summary';
import { buildSearchDocumentsTool } from '@/lib/ai/tools/search-documents';
import { buildCreateExpenseTool } from '@/lib/ai/tools/create-expense';
import { buildCreateJournalEntryTool } from '@/lib/ai/tools/create-journal-entry';
import { buildManageHRTool } from '@/lib/ai/tools/manage-hr';
import { buildManageInventoryTool } from '@/lib/ai/tools/manage-inventory';
import { buildGenerateVatTool } from '@/lib/ai/tools/generate-vat';
import { buildDepreciateAssetsTool } from '@/lib/ai/tools/depreciate-assets';
import { buildAutoApproveTool } from '@/lib/ai/tools/auto-approve';
import { buildProcessInboxTool } from '@/lib/ai/tools/process-inbox';
import { buildGenerateChartTool } from '@/lib/ai/tools/generate-chart';

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
Когато потребителят поиска да види данни във вид на графика (chart, графики, барчарт, пайчарт), ПЪРВО извикай съответния инструмент за данни (напр. getFinancialSummary или manageInventory), и СЛЕД ТОВА задължително извикай инструмента generateChart с извлечените данни, за да ги нарисуваш на екрана. Избирай подходящ тип графика (bar, line, pie).
Текуща дата: ${new Date().toISOString()}`;

    const result = streamText({
      model: anthropic('claude-3-5-sonnet-latest'),
      system: context,
      messages: messages,
      tools: {
        createInvoice: buildCreateInvoiceTool(tenantId, userId),
        getFinancialSummary: buildGetFinancialSummaryTool(tenantId),
        searchDocuments: buildSearchDocumentsTool(tenantId),
        bankMatch: buildBankMatchTool(tenantId),
        createExpense: buildCreateExpenseTool(tenantId, userId),
        createJournalEntry: buildCreateJournalEntryTool(tenantId, userId),
        manageHR: buildManageHRTool(tenantId),
        manageInventory: buildManageInventoryTool(tenantId),
        generateVat: buildGenerateVatTool(tenantId),
        depreciateAssets: buildDepreciateAssetsTool(tenantId, userId),
        autoApprove: buildAutoApproveTool(tenantId, userId),
        processInbox: buildProcessInboxTool(tenantId),
        generateChart: buildGenerateChartTool(),
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
