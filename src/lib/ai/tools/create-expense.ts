import { tool } from 'ai';
import { z } from 'zod';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildCreateExpenseTool = (tenantId: string, userId: string) =>
  tool({
    description: 'Предлага фирмен разход. Записът се създава само след човешко одобрение в AI Inbox.',
    inputSchema: z.object({
      description: z.string(),
      amount: z.number().positive(),
      category: z.string(),
      expenseDate: z.string().optional(),
    }),
    execute: async (input) =>
      queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'createExpense',
        risk: 'high',
        title: `Одобрение на разход: ${input.description}`,
        description: `AI предлага разход за ${input.amount.toFixed(2)} в категория ${input.category}.`,
        sourceType: 'expense',
        payload: input,
        summary: input,
      }),
  });
