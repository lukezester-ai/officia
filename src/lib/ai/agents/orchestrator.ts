import type { TenantAiSnapshot } from '@/lib/ai/context';
import { executorAgents } from './executors';
import { routeOrchestratorByKeywords } from './orchestrator-keywords';
import { routeOrchestratorSmart } from './smart-router';
import type {
  ExecutorDomain,
  ExecutorToolKey,
  OrchestratorRouting,
} from './types';

const ORCHESTRATOR_PROMPT = `Ти си „Диригент“ (Orchestrator) на Officia AI.
Координираш 4 изпълнителски агента:
1. Счетоводство — фактури, разходи, ДДС, справки, NRA
2. Банкиране — съпоставяне на плащания
3. HR — служители, отпуски, одобрения
4. Документи — архив, inbox, сканиране

Работен процес:
1. Разбери намерението от маршрутизацията и контекста на фирмата.
2. Използвай предложените tools — не извиквай tools извън активните.
3. При write операции обясни какво ще запишеш, после извикай tool.
4. При смесени заявки работи последователно: счетоводство → банка → HR → документи.
5. Ако липсват данни — попитай конкретно (сума, дата, контрагент), не измисляй.
6. Отговаряй на български. Не измисляй числа — използвай tools или кажи че няма данни.`;

export function routeOrchestrator(text: string): OrchestratorRouting {
  return routeOrchestratorByKeywords(text);
}

export async function routeOrchestratorAsync(options: {
  tenantId: string;
  userId: string;
  lastUserText: string;
  recentConversation: string;
  tenantSnapshot: TenantAiSnapshot;
}): Promise<OrchestratorRouting> {
  return routeOrchestratorSmart(options);
}

export function buildOrchestratorSystemPrompt(
  tenantId: string,
  routing: OrchestratorRouting,
  tenantSnapshot?: TenantAiSnapshot,
): string {
  const executorSections = routing.activeDomains
    .map((domain) => {
      const agent = executorAgents.find((item) => item.id === domain);
      if (!agent) return '';
      return `### ${agent.label}\n${agent.systemPrompt}\nИнструменти: ${agent.toolKeys.join(', ')}`;
    })
    .join('\n\n');

  const routingLines =
    routing.subTasks.length > 0
      ? routing.subTasks
          .map(
            (task) =>
              `- ${task.domain} → ${task.suggestedTool}${task.requiresHumanReview ? ' (изисква преглед)' : ''}: ${task.reason}`,
          )
          .join('\n')
      : '- Няма конкретен домейн — използвай най-подходящия агент според контекста.';

  const routingMeta = [
    routing.intentSummary ? `Намерение: ${routing.intentSummary}` : null,
    routing.reasoning ? `Обосновка: ${routing.reasoning}` : null,
    routing.confidence != null ? `Увереност: ${Math.round(routing.confidence * 100)}%` : null,
    routing.routingMode ? `Режим: ${routing.routingMode}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const snapshotLine = tenantSnapshot?.summaryText ?? '';

  return `${ORCHESTRATOR_PROMPT}

Контекст:
- Tenant ID: ${tenantId}
- Дата: ${new Date().toISOString()}
${snapshotLine ? `- ${snapshotLine}` : ''}

Маршрутизация:
${routing.summary}
${routingMeta ? `\n${routingMeta}` : ''}

План:
${routingLines}

Активни изпълнители:
${executorSections}`;
}

export function getActiveToolKeys(routing: OrchestratorRouting): ExecutorToolKey[] {
  if (routing.suggestedToolKeys && routing.suggestedToolKeys.length > 0) {
    const allowed = new Set<ExecutorToolKey>();
    for (const domain of routing.activeDomains) {
      const agent = executorAgents.find((item) => item.id === domain);
      if (agent) {
        for (const key of agent.toolKeys) {
          allowed.add(key);
        }
      }
    }
    const filtered = routing.suggestedToolKeys.filter((key) => allowed.has(key));
    if (filtered.length > 0) {
      return filtered;
    }
  }

  if (routing.routedTo === 'general') {
    return executorAgents.flatMap((agent) => agent.toolKeys);
  }

  const keys = new Set<ExecutorToolKey>();
  for (const domain of routing.activeDomains) {
    const agent = executorAgents.find((item) => item.id === domain);
    if (agent) {
      for (const key of agent.toolKeys) {
        keys.add(key);
      }
    }
  }
  return [...keys];
}

export { ORCHESTRATOR_PROMPT };
