import { tool } from 'ai';
import { z } from 'zod';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildProcessInboxTool = (tenantId: string, userId: string) =>
  tool({
    description: 'Предлага обработване на отворените AI Inbox елементи. Промяната изисква човешко одобрение.',
    inputSchema: z.object({ run: z.boolean().optional().default(true) }),
    execute: async (input) =>
      queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'processInbox',
        risk: 'medium',
        title: 'Одобрение за обработване на AI Inbox',
        description: 'AI предлага отворените известия да бъдат маркирани като обработени.',
        sourceType: 'ai_inbox',
        payload: input,
      }),
  });
