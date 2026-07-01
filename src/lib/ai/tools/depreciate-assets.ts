import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { eq, and } from 'drizzle-orm';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildDepreciateAssetsTool = (tenantId: string, userId: string) => tool({
  description: "Изчислява и начислява месечни амортизации на всички Дълготрайни материални активи (ДМА). Използвай го, когато потребителят иска да начисли амортизациите за месеца.",
  inputSchema: z.object({
    year: z.number().describe("Година (напр. 2024)"),
    month: z.number().describe("Месец (от 1 до 12)"),
  }),
  execute: async ({ year, month }) => {
    try {
       const assets = await db.select().from(fixedAssets).where(
         and(
           eq(fixedAssets.tenantId, tenantId),
           eq(fixedAssets.isActive, true)
         )
       );

       if (assets.length === 0) {
         return { success: true, message: "В системата няма регистрирани активни Дълготрайни материални активи (ДМА), за които да се начислява амортизация." };
       }

       let processedAssets = 0;
       let totalDepreciation = 0;
       for (const asset of assets) {
          const cost = parseFloat(asset.acquisitionCost || '0');
          const months = parseFloat(asset.usefulLifeMonths || '1');
          if (months > 0) {
             totalDepreciation += cost / months;
             processedAssets++;
          }
       }

       return await queueAiApprovalRequest({
         tenantId,
         userId,
         actionKey: 'depreciateAssets',
         risk: 'high',
         title: `Преглед на амортизациите за ${month}/${year}`,
         description: `Изчислена е амортизация за ${processedAssets} активни дълготрайни актива. Няма да бъде записана счетоводна статия преди човешко одобрение.`,
         sourceType: 'fixed_asset',
         payload: { year, month, assetIds: assets.map((asset) => asset.id) },
         summary: {
           processedAssets,
           totalDepreciation: totalDepreciation.toFixed(2),
           period: `${month}/${year}`,
         },
       });
    } catch (err: any) {
       console.error("AI Depreciate Assets Error:", err);
       return { success: false, message: `Грешка при изчисление на амортизации: ${err.message}` };
    }
  }
});
