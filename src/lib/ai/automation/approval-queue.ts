import { createHash } from 'node:crypto';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { and, eq } from 'drizzle-orm';

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
  const sourceId = input.sourceId ?? createHash('sha256')
    .update(JSON.stringify({ tenantId: input.tenantId, userId: input.userId, actionKey: input.actionKey, payload: input.payload }))
    .digest('hex');

  const [existing] = await db
    .select()
    .from(aiInboxItems)
    .where(
      and(
        eq(aiInboxItems.tenantId, input.tenantId),
        eq(aiInboxItems.type, 'ai_approval_required'),
        eq(aiInboxItems.sourceId, sourceId),
        eq(aiInboxItems.status, 'open'),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      success: true,
      approvalRequired: true,
      approvalId: existing.id,
      status: existing.status,
      priority: existing.priority,
      message: `Approval request already queued: ${input.title}`,
    };
  }

  const [item] = await db
    .insert(aiInboxItems)
    .values({
      tenantId: input.tenantId,
      type: 'ai_approval_required',
      sourceType: input.sourceType ?? 'ai_action',
      sourceId,
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
