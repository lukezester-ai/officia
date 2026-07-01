import { tool } from 'ai';
import { z } from 'zod';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildBankMatchTool = (tenantId: string, userId: string) =>
  tool({
    description: 'Предлага банковото съгласуване. Транзакции и фактури се променят само след човешко одобрение.',
    inputSchema: z.object({
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.8),
    }),
    execute: async (input) =>
      queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'bankMatch',
        risk: 'high',
        title: 'Одобрение на банково съгласуване',
        description: `AI ще съгласува плащания с минимална увереност ${Math.round(input.confidenceThreshold * 100)}%.`,
        sourceType: 'bank_transaction',
        payload: input,
        summary: input,
      }),
  });
