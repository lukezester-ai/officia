// @ts-nocheck
import { anthropic } from '@ai-sdk/anthropic';
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

export async function processAIRequest(input: AIRequest): Promise<AIResponse> {
  const context = await buildRichContext(input.tenantId, input.userId);
  
  // В момента връщаме всички налични инструменти,
  // в бъдеще може да се филтрират според tenantId (роля/план).
  const availableTools = tools as Record<string, Tool>;

  const result = await generateText({
    model: anthropic('claude-3-5-sonnet-20240620'),
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
