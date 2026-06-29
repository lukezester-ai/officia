import { NextResponse } from 'next/server';
import { executorAgents, ORCHESTRATOR_PROMPT } from '@/lib/ai/agents';
import { aiAutomationRegistry } from '@/lib/ai/automation/registry';

export async function GET() {
  return NextResponse.json({
    orchestrator: {
      id: 'orchestrator',
      label: 'AI Диригент',
      description: ORCHESTRATOR_PROMPT.split('\n')[0],
    },
    executors: executorAgents.map((agent) => ({
      id: agent.id,
      label: agent.label,
      description: agent.description,
      tools: agent.toolKeys,
    })),
    registry: aiAutomationRegistry.summary,
  });
}
