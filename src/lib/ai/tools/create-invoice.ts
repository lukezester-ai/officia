import { tool } from 'ai';
import { z } from 'zod';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildCreateInvoiceTool = (tenantId: string, userId: string) =>
  tool({
    description: 'Предлага нова продажна фактура. Фактурата се създава само след човешко одобрение в AI Inbox.',
    inputSchema: z.object({
      clientName: z.string(),
      items: z.array(
        z.object({
          description: z.string(),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative(),
          vatRate: z.number().min(0).max(100).optional().default(20),
        }),
      ).min(1),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    }),
    execute: async (input) => {
      const total = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice * (1 + item.vatRate / 100),
        0,
      );
      return queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'createInvoice',
        risk: 'high',
        title: `Одобрение на фактура за ${input.clientName}`,
        description: `AI предлага продажна фактура на стойност ${total.toFixed(2)}.`,
        sourceType: 'invoice',
        payload: input,
        summary: { clientName: input.clientName, total: total.toFixed(2), lineCount: input.items.length },
      });
    },
  });
