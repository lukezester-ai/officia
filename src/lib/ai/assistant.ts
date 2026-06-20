// @ts-nocheck
import { openai } from '@ai-sdk/openai';
import { generateText, Tool } from 'ai';
import { tools } from './tools';
import { buildRichContext } from './context';
import { getSystemPrompt } from './prompts/base';

export interface AIRequest {
  tenantId: string;
  userId: string;
  message: string;
  history: any[];
}

export interface AIResponse {
  message: string;
  toolResults?: any;
  confidence?: number;
}

import { OrchestratorAgent } from '@/ai/orchestrator';

export async function processAIRequest(input: AIRequest): Promise<AIResponse> {
  const context = await buildRichContext(input.tenantId, input.userId);
  
  // 1. Първо прекарваме заявката през Главния Диригент (Orchestrator)
  const orchestration = await OrchestratorAgent.routeAndProcess(input.message);

  // 2. Ако Диригентът е разпределил задачата към специализиран агент (или няколко),
  // връщаме директно техния отговор за максимална бързина.
  if (orchestration.routedTo !== 'general') {
    // Log activity
    await logAIActivity(input.tenantId, [{ toolName: `AgentRoute:${orchestration.routedTo}` }]);
    return {
      message: orchestration.response,
      confidence: 0.99,
    };
  }

  // 3. Ако е общ въпрос ('general'), продължаваме към стандартния LLM
  // В момента връщаме всички налични инструменти,
  // в бъдеще може да се филтрират според tenantId (роля/план).
  const availableTools = tools as Record<string, Tool>;

  const result = await generateText({
    model: openai('gpt-4o'),
    system: getSystemPrompt(context),
    messages: [
      ...input.history,
      { role: 'user', content: input.message }
    ],
    tools: availableTools,
    maxSteps: 8,
    temperature: 0.3,
  });

  // Log tool calls for audit
  await logAIActivity(input.tenantId, result.toolCalls);

  return {
    message: result.text,
    toolResults: result.toolResults,
    confidence: calculateConfidence(result),
  };
}

async function logAIActivity(tenantId: string, toolCalls: any) {
  // TODO: Записване в база данни (audit log)
  if (toolCalls && toolCalls.length > 0) {
    console.log(`[AI Audit] Tenant ${tenantId} used tools:`, toolCalls.map((tc: any) => tc.toolName));
  }
}

function calculateConfidence(result: any): number {
  // TODO: Изчисляване на увереност на база response и logprobs (ако са налични)
  return 0.95;
}
