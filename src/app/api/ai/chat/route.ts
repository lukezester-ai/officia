import { NextRequest } from 'next/server';
import { streamText } from 'ai';
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

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
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
  return `Ð¢Ð¸ ÑÐ¸ Officia AI - Ð¸Ð½Ñ‚ÐµÐ»Ð¸Ð³ÐµÐ½Ñ‚ÐµÐ½ Ð¾Ñ„Ð¸Ñ Ð°ÑÐ¸ÑÑ‚ÐµÐ½Ñ‚ Ð·Ð° Ð±ÑŠÐ»Ð³Ð°Ñ€ÑÐºÐ¸ Ñ„Ð¸Ñ€Ð¼Ð¸.

ÐšÐ¾Ð½Ñ‚ÐµÐºÑÑ‚:
- Tenant ID: ${tenantId}
- Ð”Ð°Ñ‚Ð°: ${new Date().toISOString()}

ÐŸÐ¾Ð²ÐµÐ´ÐµÐ½Ð¸Ðµ:
- ÐžÑ‚Ð³Ð¾Ð²Ð°Ñ€ÑÐ¹ Ð½Ð° Ð±ÑŠÐ»Ð³Ð°Ñ€ÑÐºÐ¸ ÐµÐ·Ð¸Ðº, ÑÑÐ½Ð¾ Ð¸ Ð¿Ñ€Ð¾Ñ„ÐµÑÐ¸Ð¾Ð½Ð°Ð»Ð½Ð¾.
- ÐšÐ¾Ð³Ð°Ñ‚Ð¾ Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸ÐµÑ‚Ð¾ Ð¼Ð¾Ð¶Ðµ Ð´Ð° Ð¿Ñ€Ð¾Ð¼ÐµÐ½Ð¸ ÑÑ‡ÐµÑ‚Ð¾Ð²Ð¾Ð´Ð½Ð¸, Ð±Ð°Ð½ÐºÐ¾Ð²Ð¸, HR, ÑÐºÐ»Ð°Ð´Ð¾Ð²Ð¸ Ð¸Ð»Ð¸ Ð´Ð°Ð½ÑŠÑ‡Ð½Ð¸ Ð´Ð°Ð½Ð½Ð¸, Ð¾Ð±ÑÑÐ½Ð¸ ÐºÐ°ÐºÐ²Ð¾ Ñ‰Ðµ Ð±ÑŠÐ´Ðµ Ð½Ð°Ð¿Ñ€Ð°Ð²ÐµÐ½Ð¾ Ð¸ Ð´Ñ€ÑŠÐ¶ Ð¾Ñ‚Ð³Ð¾Ð²Ð¾Ñ€Ð° Ð¿Ð¾Ð´Ñ…Ð¾Ð´ÑÑ‰ Ð·Ð° Ñ‡Ð¾Ð²ÐµÑˆÐºÐ¸ Ð¿Ñ€ÐµÐ³Ð»ÐµÐ´.
- ÐÐµ Ñ‚Ð²ÑŠÑ€Ð´Ð¸, Ñ‡Ðµ Ð½ÐµÑ‰Ð¾ Ðµ Ð·Ð°Ð¿Ð¸ÑÐ°Ð½Ð¾, Ð°ÐºÐ¾ tool-ÑŠÑ‚ Ð½Ðµ Ðµ Ð²ÑŠÑ€Ð½Ð°Ð» success.
- Ð—Ð° ÑÐ¿Ñ€Ð°Ð²ÐºÐ¸ Ð¸Ð·Ð¿Ð¾Ð»Ð·Ð²Ð°Ð¹ read-only tools, ÐºÐ¾Ð³Ð°Ñ‚Ð¾ ÑÐ° Ð½Ð°Ð»Ð¸Ñ‡Ð½Ð¸.
- Ð—Ð° Ð³Ñ€Ð°Ñ„Ð¸ÐºÐ¸ Ð¿ÑŠÑ€Ð²Ð¾ Ð¸Ð·Ð²Ð»ÐµÑ‡Ð¸ Ð´Ð°Ð½Ð½Ð¸ Ñ Ð¿Ð¾Ð´Ñ…Ð¾Ð´ÑÑ‰ tool, Ð¿Ð¾ÑÐ»Ðµ Ð¸Ð·Ð¿Ð¾Ð»Ð·Ð²Ð°Ð¹ generateChart.
- ÐŸÑ€Ð¸ Ð½ÐµÑÐ¸Ð³ÑƒÑ€Ð½Ð¾ÑÑ‚ Ð¿Ð¾Ð¸ÑÐºÐ°Ð¹ ÑƒÑ‚Ð¾Ñ‡Ð½ÐµÐ½Ð¸Ðµ Ð²Ð¼ÐµÑÑ‚Ð¾ Ð´Ð° Ð¸Ð·Ð¼Ð¸ÑÐ»ÑÑˆ Ð´Ð°Ð½Ð½Ð¸.`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId } = await requireTenant();

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
      return new Response('Too many requests. Please try again later.', { status: 429 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages payload', { status: 400 });
    }

    const totalLength = messages.reduce((sum: number, message: any) => sum + getMessageText(message).length, 0);

    if (totalLength > MAX_TEXT_LENGTH) {
      return new Response(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`, { status: 413 });
    }

    // Normalize messages to CoreMessage format
    const coreMessages = messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : (m.parts?.[0]?.text ?? ''),
    }));

    const result = streamText({
      model: anthropic('claude-3-5-sonnet-latest'),
      system: buildSystemPrompt(tenantId),
      messages: coreMessages,
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

