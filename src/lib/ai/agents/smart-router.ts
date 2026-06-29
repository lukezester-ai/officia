import { generateObject } from 'ai';
import { z } from 'zod';
import { getAiCapability } from '@/lib/ai/automation/registry';
import { getAnthropicRouterModel } from '@/lib/ai/model';
import type { TenantAiSnapshot } from '@/lib/ai/context';
import { executorAgents } from './executors';
import { routeOrchestratorByKeywords } from './orchestrator-keywords';
import type {
  ExecutorDomain,
  ExecutorToolKey,
  OrchestratorRouting,
  OrchestratorSubTask,
} from './types';

const ALL_TOOL_KEYS = executorAgents.flatMap((agent) => agent.toolKeys);

const routingSchema = z.object({
  domains: z
    .array(z.enum(['accounting', 'banking', 'hr', 'documents']))
    .min(1)
    .max(4),
  confidence: z.number().min(0).max(1),
  intentSummary: z.string(),
  suggestedTools: z.array(z.string()),
  reasoning: z.string(),
  needsClarification: z.boolean(),
  clarifyingQuestion: z.string().nullable(),
});

export type SmartRouterInput = {
  tenantId: string;
  userId: string;
  lastUserText: string;
  recentConversation: string;
  tenantSnapshot: TenantAiSnapshot;
};

function isExecutorToolKey(value: string): value is ExecutorToolKey {
  return ALL_TOOL_KEYS.includes(value as ExecutorToolKey);
}

function buildRouterPrompt(input: SmartRouterInput): string {
  const agentCatalog = executorAgents
    .map(
      (agent) =>
        `- ${agent.id} (${agent.label}): ${agent.description}\n  Tools: ${agent.toolKeys.join(', ')}`,
    )
    .join('\n');

  return `Ти си маршрутизатор за Officia ERP AI. Анализирай заявката и избери домейн(и) и tools.

Агенти:
${agentCatalog}

Правила:
- Избери 1–4 домейна. При смесена заявка (напр. фактура + банково съгласуване) включи всички релевантни домейни.
- suggestedTools: само валидни tool keys от каталога по-горе, максимум 5.
- При общ разговор без ERP действие → domains: всички 4, confidence < 0.5, suggestedTools: [].
- needsClarification=true само ако липсват критични данни (сума, дата, контрагент).
- Отговаряй на български в intentSummary и reasoning.

Контекст на фирмата: ${input.tenantSnapshot.summaryText}

Скорошен разговор:
${input.recentConversation || '(няма)'}

Последно съобщение на потребителя:
${input.lastUserText}`;
}

function buildSubTasks(
  domains: ExecutorDomain[],
  suggestedTools: ExecutorToolKey[],
): OrchestratorSubTask[] {
  return domains.map((domain) => {
    const agent = executorAgents.find((item) => item.id === domain);
    const domainTools = agent?.toolKeys ?? [];
    const suggestedTool =
      suggestedTools.find((tool) => domainTools.includes(tool)) ?? domainTools[0] ?? 'searchDocuments';

    const capability = getAiCapability(suggestedTool);

    return {
      domain,
      suggestedTool,
      requiresHumanReview: capability?.requiresHumanReview ?? true,
      reason: `LLM насочи към „${agent?.label ?? domain}“ с tool „${suggestedTool}“.`,
    };
  });
}

function mergeWithKeywordFallback(
  llmRouting: OrchestratorRouting,
  keywordRouting: OrchestratorRouting,
): OrchestratorRouting {
  if (keywordRouting.routedTo === 'general') {
    return llmRouting;
  }

  const mergedDomains = [
    ...new Set([...llmRouting.activeDomains, ...keywordRouting.activeDomains]),
  ] as ExecutorDomain[];

  const llmTools = llmRouting.suggestedToolKeys ?? [];
  const keywordTools = keywordRouting.subTasks.map((task) => task.suggestedTool);
  const mergedTools = [...new Set([...llmTools, ...keywordTools])] as ExecutorToolKey[];

  const routedTo: OrchestratorRouting['routedTo'] =
    mergedDomains.length === 1 ? mergedDomains[0] : 'multiple';

  const agentLabels = mergedDomains
    .map((domain) => executorAgents.find((agent) => agent.id === domain)?.label ?? domain)
    .join(', ');

  return {
    routedTo,
    summary: `Диригентът (LLM + ключови думи) насочи към: ${agentLabels}.`,
    subTasks: buildSubTasks(mergedDomains, mergedTools),
    activeDomains: mergedDomains,
    suggestedToolKeys: mergedTools,
    confidence: llmRouting.confidence,
    intentSummary: llmRouting.intentSummary,
    reasoning: [llmRouting.reasoning, keywordRouting.summary].filter(Boolean).join(' '),
    routingMode: 'hybrid',
  };
}

export async function routeOrchestratorSmart(
  input: SmartRouterInput,
): Promise<OrchestratorRouting> {
  const keywordFallback = routeOrchestratorByKeywords(input.lastUserText);

  if (!process.env.ANTHROPIC_API_KEY || !input.lastUserText.trim()) {
    return { ...keywordFallback, routingMode: 'keywords' };
  }

  try {
    const { object } = await generateObject({
      model: getAnthropicRouterModel(),
      schema: routingSchema,
      prompt: buildRouterPrompt(input),
      temperature: 0.1,
    });

    if (object.needsClarification && object.confidence >= 0.6) {
      const question =
        object.clarifyingQuestion?.trim() ||
        'Моля уточни какво точно искаш да направим (счетоводство, банка, HR или документи).';

      return {
        routedTo: 'general',
        summary: question,
        subTasks: [],
        activeDomains: executorAgents.map((agent) => agent.id),
        confidence: object.confidence,
        intentSummary: object.intentSummary,
        reasoning: object.reasoning,
        routingMode: 'llm',
      };
    }

    const validTools = object.suggestedTools.filter(isExecutorToolKey);
    const domains = object.domains as ExecutorDomain[];

    if (domains.length === 0 || object.confidence < 0.35) {
      const merged = mergeWithKeywordFallback(
        {
          routedTo: 'general',
          summary: object.intentSummary,
          subTasks: [],
          activeDomains: executorAgents.map((agent) => agent.id),
          confidence: object.confidence,
          intentSummary: object.intentSummary,
          reasoning: object.reasoning,
          routingMode: 'llm',
        },
        keywordFallback,
      );
      return merged.routingMode === 'hybrid' && merged.activeDomains.length > 0
        ? merged
        : { ...keywordFallback, routingMode: 'keywords' };
    }

    const activeDomains = [...new Set(domains)] as ExecutorDomain[];
    const routedTo: OrchestratorRouting['routedTo'] =
      activeDomains.length === 1 ? activeDomains[0] : 'multiple';

    const agentLabels = activeDomains
      .map((domain) => executorAgents.find((agent) => agent.id === domain)?.label ?? domain)
      .join(', ');

    const subTasks = buildSubTasks(activeDomains, validTools);
    const reviewNote = subTasks.some((task) => task.requiresHumanReview)
      ? ' Част от действията изискват човешки преглед.'
      : '';

    const llmRouting: OrchestratorRouting = {
      routedTo,
      summary: `${object.intentSummary} → ${agentLabels}.${reviewNote}`,
      subTasks,
      activeDomains,
      suggestedToolKeys: validTools.length > 0 ? validTools : undefined,
      confidence: object.confidence,
      intentSummary: object.intentSummary,
      reasoning: object.reasoning,
      routingMode: 'llm',
    };

    return mergeWithKeywordFallback(llmRouting, keywordFallback);
  } catch (error) {
    console.error('Smart router LLM error, falling back to keywords:', error);
    return { ...keywordFallback, routingMode: 'keywords' };
  }
}
