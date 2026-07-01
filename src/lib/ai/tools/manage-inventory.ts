import { tool } from 'ai';
import { z } from 'zod';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildManageInventoryTool = (tenantId: string, userId: string) =>
  tool({
    description: 'Предлага складова проверка и задачи за снабдяване. Задачите се създават само след одобрение.',
    inputSchema: z.object({ minThreshold: z.number().nonnegative().optional().default(5) }),
    execute: async (input) =>
      queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'manageInventory',
        risk: 'medium',
        title: 'Одобрение на складова проверка',
        description: `AI предлага задачи за артикули с наличност до ${input.minThreshold}.`,
        sourceType: 'inventory',
        payload: input,
        summary: input,
      }),
  });
