import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';

type AiApprovalRisk = 'low' | 'medium' | 'high' | 'critical';

type QueueAiApprovalRequestInput = {
  tenantId: string;
  userId?: string | null;
  actionKey: string;
  risk: AiApprovalRisk;
  title: string;
  description?: string;
  sourceType?: string;
  sourceId?: string;
  payload?: unknown;
  summary?: unknown;
  assignedTo?: string | null;
};

function riskToPriority(risk: AiApprovalRisk) {
  if (risk === 'critical') return 'critical';
  if (risk === 'high') return 'high';
  if (risk === 'medium') return 'normal';
  return 'low';
}

export async function queueAiApprovalRequest(input: QueueAiApprovalRequestInput) {
  const [item] = await db
    .insert(aiInboxItems)
    .values({
      tenantId: input.tenantId,
      type: 'ai_approval_required',
      sourceType: input.sourceType ?? 'ai_action',
      sourceId: input.sourceId ?? randomUUID(),
      title: input.title,
      description: input.description,
      confidence: '0.95',
      status: 'open',
      priority: riskToPriority(input.risk),
      assignedTo: input.assignedTo ?? null,
      metaJson: {
        mode: 'human_required',
        actionKey: input.actionKey,
        requestedBy: input.userId ?? null,
        risk: input.risk,
        payload: input.payload ?? null,
        summary: input.summary ?? null,
      },
    })
    .returning();

  return {
    success: true,
    approvalRequired: true,
    approvalId: item.id,
    status: item.status,
    priority: item.priority,
    message: `Approval request queued for human review: ${input.title}`,
  };
}
