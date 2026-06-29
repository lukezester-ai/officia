import { NextRequest } from 'next/server';
import { convertToModelMessages, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildBankMatchTool } from '@/lib/ai/tools/bank-match';
import { requireTenant } from '@/lib/auth/get-tenant';
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
import { buildCheckNraStatusTool } from '@/lib/ai/tools/check-nra-status';
import { buildCheckNraLiabilitiesTool } from '@/lib/ai/tools/check-nra-liabilities';
import { checkRateLimit } from '@/lib/api/rate-limit';

const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TEXT_LENGTH = 15_000;

function getMessageText(message: any) {
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
  }
  return '';
}

function buildSystemPrompt(tenantId: string) {
  return `Ти си Officia AI - интелигентен офис асистент за български фирми.

Контекст:
- Tenant ID: ${tenantId}
- Дата: ${new Date().toISOString()}

Поведение:
- Отговаряй на български език, ясно и професионално.
- Когато действието може да промени счетоводни, банкови, HR, складови или данъчни данни, обясни какво ще бъде направено и държи отговора подходящ за човешки преглед.
- Не твърди, че нещо е записано, ако tool-ът не е върнал success.
- За справки използвай read-only tools, когато са налични.
- За графики първо извлечи данни с подходящ tool, после използвай generateChart.
- При несигурност поискай уточнение вместо да измисляш данни.`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await requireTenant();

    const rateLimit = await checkRateLimit(`ai-chat:${userId}`, MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.success) {
      return new Response('Too many requests. Please try again later.', {
        status: 429,
        headers: { 'X-RateLimit-Reset': rateLimit.reset.toString() },
      });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages payload', { status: 400 });
    }

    const totalLength = messages.reduce((sum: number, message: any) => sum + getMessageText(message).length, 0);

    if (totalLength > MAX_TEXT_LENGTH) {
      return new Response(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`, { status: 413 });
    }

    const result = streamText({
      model: anthropic('claude-3-5-sonnet-latest'),
      system: buildSystemPrompt(tenantId),
      messages: await convertToModelMessages(messages),
      tools: {
        createInvoice: buildCreateInvoiceTool(tenantId, userId),
        getFinancialSummary: buildGetFinancialSummaryTool(tenantId),
        searchDocuments: buildSearchDocumentsTool(tenantId),
        bankMatch: buildBankMatchTool(tenantId),
        createExpense: buildCreateExpenseTool(tenantId, userId),
        createJournalEntry: buildCreateJournalEntryTool(tenantId, userId),
        manageHR: buildManageHRTool(tenantId),
        manageInventory: buildManageInventoryTool(tenantId),
        generateVat: buildGenerateVatTool(tenantId, userId),
        depreciateAssets: buildDepreciateAssetsTool(tenantId, userId),
        autoApprove: buildAutoApproveTool(tenantId, userId),
        processInbox: buildProcessInboxTool(tenantId),
        generateChart: buildGenerateChartTool(),
        checkNraStatus: buildCheckNraStatusTool(),
        checkNraLiabilities: buildCheckNraLiabilitiesTool(),
      },
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);
    if (error.message === 'Not authenticated' || error.message === 'User not found in local database' || error.message === 'User does not belong to any tenant') {
      return new Response('Forbidden or Unauthorized', { status: 403 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
}
