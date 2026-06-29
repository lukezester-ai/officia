import { getAiCapability } from '@/lib/ai/automation/registry';
import { executorAgents } from './executors';
import type { OrchestratorRouting, OrchestratorSubTask } from './types';

export function routeOrchestratorByKeywords(text: string): OrchestratorRouting {
  const lowerText = text.toLowerCase();

  const matches = executorAgents
    .map((executor) => {
      const matched = executor.keywords.some((keyword) => lowerText.includes(keyword));
      if (!matched) return null;

      const suggestedTool = executor.toolKeys[0];
      const capability = getAiCapability(suggestedTool);

      return {
        domain: executor.id,
        suggestedTool,
        requiresHumanReview: capability?.requiresHumanReview ?? true,
        reason: `Ключова дума сочи към домейн „${executor.label}“.`,
      } satisfies OrchestratorSubTask;
    })
    .filter((task): task is OrchestratorSubTask => task !== null);

  if (matches.length === 0) {
    return {
      routedTo: 'general',
      summary:
        'Диригентът не откри ясен домейн — активни са всички 4 изпълнителски агента. Уточни дали става дума за счетоводство, банка, HR или документи.',
      subTasks: [],
      activeDomains: executorAgents.map((agent) => agent.id),
    };
  }

  const activeDomains = [...new Set(matches.map((task) => task.domain))];
  const routedTo: OrchestratorRouting['routedTo'] =
    activeDomains.length === 1 ? activeDomains[0] : 'multiple';

  const agentLabels = activeDomains
    .map((domain) => executorAgents.find((agent) => agent.id === domain)?.label ?? domain)
    .join(', ');

  const reviewNote = matches.some((task) => task.requiresHumanReview)
    ? ' Част от действията изискват човешки преглед.'
    : '';

  return {
    routedTo,
    summary: `Диригентът насочи заявката към: ${agentLabels}.${reviewNote}`,
    subTasks: matches,
    activeDomains,
  };
}
