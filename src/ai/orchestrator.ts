import {
  buildOrchestratorSystemPrompt,
  routeOrchestrator,
  type OrchestratorResult,
  type OrchestratorSubTask,
} from '@/lib/ai/agents';

export type { OrchestratorResult, OrchestratorSubTask };

/** @deprecated Use routeOrchestrator from @/lib/ai/agents */
export class OrchestratorAgent {
  static async routeAndProcess(text: string): Promise<OrchestratorResult> {
    const routing = routeOrchestrator(text);

    return {
      routedTo: routing.routedTo,
      response: routing.summary,
      subTasks: routing.subTasks,
    };
  }
}

export { buildOrchestratorSystemPrompt, routeOrchestrator };
