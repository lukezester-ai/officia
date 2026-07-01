import { buildAutoApproveTool } from '@/lib/ai/tools/auto-approve';
import { buildBankMatchTool } from '@/lib/ai/tools/bank-match';
import { buildCheckNraLiabilitiesTool } from '@/lib/ai/tools/check-nra-liabilities';
import { buildCheckNraStatusTool } from '@/lib/ai/tools/check-nra-status';
import { buildCreateExpenseTool } from '@/lib/ai/tools/create-expense';
import { buildCreateInvoiceTool } from '@/lib/ai/tools/create-invoice';
import { buildCreateJournalEntryTool } from '@/lib/ai/tools/create-journal-entry';
import { buildDepreciateAssetsTool } from '@/lib/ai/tools/depreciate-assets';
import { buildGenerateChartTool } from '@/lib/ai/tools/generate-chart';
import { buildGenerateVatTool } from '@/lib/ai/tools/generate-vat';
import { buildGetFinancialSummaryTool } from '@/lib/ai/tools/get-financial-summary';
import { buildManageHRTool } from '@/lib/ai/tools/manage-hr';
import { buildProcessInboxTool } from '@/lib/ai/tools/process-inbox';
import { buildSearchDocumentsTool } from '@/lib/ai/tools/search-documents';
import { buildTenantAiSnapshot } from '@/lib/ai/context';
import type { ExecutorToolKey, OrchestratorRouting } from './types';
import { getActiveToolKeys, routeOrchestratorAsync } from './orchestrator';

type ToolBuilderContext = {
  tenantId: string;
  userId: string;
};

function buildAllTools({ tenantId, userId }: ToolBuilderContext) {
  return {
    createInvoice: buildCreateInvoiceTool(tenantId, userId),
    getFinancialSummary: buildGetFinancialSummaryTool(tenantId),
    searchDocuments: buildSearchDocumentsTool(tenantId),
    bankMatch: buildBankMatchTool(tenantId, userId),
    createExpense: buildCreateExpenseTool(tenantId, userId),
    createJournalEntry: buildCreateJournalEntryTool(tenantId, userId),
    manageHR: buildManageHRTool(tenantId, userId),
    generateVat: buildGenerateVatTool(tenantId, userId),
    depreciateAssets: buildDepreciateAssetsTool(tenantId, userId),
    autoApprove: buildAutoApproveTool(tenantId, userId),
    processInbox: buildProcessInboxTool(tenantId, userId),
    generateChart: buildGenerateChartTool(),
    checkNraStatus: buildCheckNraStatusTool(),
    checkNraLiabilities: buildCheckNraLiabilitiesTool(),
  } satisfies Record<ExecutorToolKey, unknown>;
}

export function buildRoutedChatTools(
  routing: OrchestratorRouting,
  context: ToolBuilderContext,
) {
  const allTools = buildAllTools(context);
  const activeKeys = getActiveToolKeys(routing);

  return Object.fromEntries(
    activeKeys.map((key) => [key, allTools[key]]),
  ) as Pick<typeof allTools, ExecutorToolKey>;
}

function formatRecentConversation(messages: { role?: string; content?: unknown; parts?: unknown[] }[]): string {
  const lines: string[] = [];

  for (const message of messages.slice(-8)) {
    const role = message.role === 'assistant' ? 'Асистент' : message.role === 'user' ? 'Потребител' : null;
    if (!role) continue;

    let text = '';
    if (typeof message.content === 'string') {
      text = message.content;
    } else if (Array.isArray(message.parts)) {
      text = message.parts
        .filter((part): part is { type: string; text?: string } => typeof part === 'object' && part !== null)
        .filter((part) => part.type === 'text')
        .map((part) => part.text ?? '')
        .join('');
    }

    if (text.trim()) {
      lines.push(`${role}: ${text.trim().slice(0, 500)}`);
    }
  }

  return lines.join('\n');
}

export async function prepareOrchestratedChat(
  lastUserText: string,
  tenantId: string,
  userId: string,
  messages: { role?: string; content?: unknown; parts?: unknown[] }[] = [],
) {
  const tenantSnapshot = await buildTenantAiSnapshot(tenantId);
  const routing = await routeOrchestratorAsync({
    tenantId,
    userId,
    lastUserText,
    recentConversation: formatRecentConversation(messages),
    tenantSnapshot,
  });
  return { routing, tenantSnapshot };
}

export { routeOrchestrator, getActiveToolKeys } from './orchestrator';
export { routeOrchestratorByKeywords } from './orchestrator-keywords';
