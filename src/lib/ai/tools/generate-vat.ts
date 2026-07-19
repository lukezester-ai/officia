// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { eq, and, sql } from 'drizzle-orm';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildGenerateVatTool = (tenantId: string, userId?: string) => tool({
  description: "Автоматичен генератор на ДДС дневници. Използвай го, когато потребителят иска да приключи месеца, да сметне ДДС-то или да генерира данъчни/ДДС дневници. Записът става след човешко одобрение.",
  parameters: z.object({
    year: z.number().describe("Година (напр. 2024)"),
    month: z.number().describe("Месец (от 1 до 12)"),
  }),
  execute: async ({ year, month }) => {
     try {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const sales = await db.select()
          .from(invoices)
          .where(
            and(
              eq(invoices.tenantId, tenantId),
              sql`${invoices.issueDate} >= ${startDate} AND ${invoices.issueDate} <= ${endDate}`
            )
          );

        const purchases = await db.select()
          .from(purchaseInvoices)
          .where(
            and(
              eq(purchaseInvoices.tenantId, tenantId),
              sql`${purchaseInvoices.issueDate} >= ${startDate} AND ${purchaseInvoices.issueDate} <= ${endDate}`
            )
          );

        if (sales.length === 0 && purchases.length === 0) {
           return { success: true, message: `Няма фактури за продажби или покупки за месец ${month}/${year}. Няма данни за генериране на ДДС дневници.` };
        }

        return await queueAiApprovalRequest({
          tenantId,
          userId,
          actionKey: 'generateVat',
          risk: 'critical',
          title: `Review VAT journals for ${month}/${year}`,
          description: `AI prepared VAT journal generation for ${sales.length} sale invoice(s) and ${purchases.length} purchase invoice(s). Existing VAT journals for the period will not be changed until approved.`,
          sourceType: 'vat_journal',
          payload: { year, month, startDate, endDate },
          summary: {
            salesCount: sales.length,
            purchasesCount: purchases.length,
            period: `${month}/${year}`,
          },
        });
     } catch (err: any) {
        console.error("AI Generate VAT Error:", err);
        return { success: false, message: `Грешка при генериране на ДДС дневници: ${err.message}` };
     }
  }
});
