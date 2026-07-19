// @ts-nocheck
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { buildCreateInvoiceTool } from './tools/create-invoice';
import { buildGetFinancialSummaryTool } from './tools/get-financial-summary';
import { buildSearchDocumentsTool } from './tools/search-documents';
import { buildBankMatchTool } from './tools/bank-match';
import { buildCreateExpenseTool } from './tools/create-expense';
import { buildCreateJournalEntryTool } from './tools/create-journal-entry';
import { buildManageHRTool } from './tools/manage-hr';
import { buildManageInventoryTool } from './tools/manage-inventory';
import { buildGenerateVatTool } from './tools/generate-vat';
import { buildDepreciateAssetsTool } from './tools/depreciate-assets';
import { buildAutoApproveTool } from './tools/auto-approve';
import { buildProcessInboxTool } from './tools/process-inbox';
import { buildGenerateChartTool } from './tools/generate-chart';
import { buildCheckNraStatusTool } from './tools/check-nra-status';
import { buildCheckNraLiabilitiesTool } from './tools/check-nra-liabilities';
import { buildRichContext } from './context';
import { findRelevantTaxLaws, buildRagSystemPrompt } from './rag/tax-rag';
import { OrchestratorAgent } from '@/ai/orchestrator';
import { runBankSyncPipeline, runMonthClosePipeline } from './orchestration';
import { tool } from 'ai';
import { z } from 'zod';

function buildOrchestrationTools(tenantId: string, userId: string) {
  return {
    runBankSync: tool({
      description:
        'Стартира банков sync pipeline: автоматично съпоставя преводи с фактури и праща несигурните в AI Inbox.',
      parameters: z.object({
        run: z.boolean().optional().describe('true за стартиране'),
      }),
      execute: async () => runBankSyncPipeline({ tenantId, userId }),
    }),
    runMonthClose: tool({
      description:
        'Месечно приключване: подготвя ДДС дневници и амортизации като заявки за одобрение в AI Inbox.',
      parameters: z.object({
        year: z.number().optional(),
        month: z.number().optional(),
      }),
      execute: async ({ year, month }) => runMonthClosePipeline({ tenantId, userId, year, month }),
    }),
    routeIntent: tool({
      description: 'Маршрутизира свободен текст към правилния домейн/агент и връща план без странични ефекти.',
      parameters: z.object({
        text: z.string().describe('Заявката на потребителя'),
      }),
      execute: async ({ text }) => OrchestratorAgent.routeAndProcess(text),
    }),
  };
}

export function buildAssistantTools(tenantId: string, userId: string) {
  return {
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
    ...buildOrchestrationTools(tenantId, userId),
  };
}

export async function runAIAssistant(
  userMessage: string,
  tenantId: string,
  userId: string,
  conversationHistory: any[] = [],
) {
  const tools = buildAssistantTools(tenantId, userId);
  const businessContext = await buildRichContext(tenantId, userId);
  const plan = await OrchestratorAgent.routeAndProcess(userMessage);
  const relevantLaws = findRelevantTaxLaws(userMessage);

  const baseSystemPrompt = `Ти си Officia AI — оркестриран офис асистент за български фирми.
Отговаряй винаги на български, ясно и професионално.

Правила:
1. Използвай инструменти за реални данни и действия — не измисляй суми, фактури или салда.
2. За записи в базата (контировки, ДДС, амортизации, отпуски) инструментите ще създадат заявка в AI Inbox за човешко одобрение — кажи това на потребителя.
3. За банково равнение и месечно приключване предпочитай runBankSync / runMonthClose.
4. При данъчни/правни въпроси цитирай предоставения RAG контекст; ако липсва — кажи че е нужна проверка.
5. Следвай оркестрационния план когато е наличен.

Оркестрационен план:
- intent: ${plan.intent}
- routedTo: ${plan.routedTo}
- confidence: ${(plan.confidence * 100).toFixed(0)}%
- steps: ${(plan.subTasks || []).map((s) => `${s.domain}:${s.suggestedTool}`).join(', ') || 'general'}

Бизнес контекст:
${businessContext}`;

  const finalSystemPrompt = buildRagSystemPrompt(baseSystemPrompt, relevantLaws);
  const model = (process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5') as any;

  try {
    const result = await generateText({
      model: anthropic(model),
      system: finalSystemPrompt,
      messages: [...conversationHistory, { role: 'user', content: userMessage }],
      tools,
      maxSteps: 5,
    });

    return {
      response: result.text,
      toolCalls: result.toolCalls,
      orchestration: plan,
      ragUsed: relevantLaws.length > 0,
    };
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    throw error;
  }
}
