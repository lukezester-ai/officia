// @ts-nocheck
'use server';

import { runAgentManagerSupervisor, AgentManagerReport } from '@/lib/ai/agents/agent-manager';
import { revalidatePath } from 'next/cache';

export async function getAgentManagerStatusAction(): Promise<AgentManagerReport> {
  const res = await runAgentManagerSupervisor();
  revalidatePath('/', 'layout');
  return res;
}
