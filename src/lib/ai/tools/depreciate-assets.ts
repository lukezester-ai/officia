// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { eq, and } from 'drizzle-orm';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildDepreciateAssetsTool = (tenantId: string, userId: string) => tool({
  description: "Изчислява и начислява месечни амортизации на всички Дълготрайни материални активи (ДМА). Използвай го, когато потребителят иска да начисли амортизациите за месеца.",
  parameters: z.object({
    year: z.number().describe("Година (напр. 2024)"),
    month: z.number().describe("Месец (от 1 до 12)"),
  }),
  execute: async ({ year, month }) => {
    try {
       // 1. Вземаме всички активни ДМА за фирмата
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
         title: `Review depreciation for ${month}/${year}`,
         description: `AI calculated depreciation for ${processedAssets} active asset(s). No journal entry was posted before human approval.`,
         sourceType: 'fixed_asset',
         payload: { year, month, assetIds: assets.map((asset) => asset.id) },
         summary: {
           processedAssets,
           totalDepreciation: totalDepreciation.toFixed(2),
           period: `${month}/${year}`,
         },
       });

       const journalDate = new Date(year, month, 0); // Последният ден на месеца

       // 2. Създаване на Хедър за груповата счетоводна статия (Главна Книга)
       const [header] = await db.insert(journalHeaders).values({
         tenantId,
         journalNumber: `DEP-${year}${month.toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
         entryDate: journalDate,
         description: `Автоматично начислени амортизации на ДМА за месец ${month}/${year}`,
         postedBy: userId,
         status: 'posted',
         aiStatus: 'verified',
         aiConfidence: '0.99'
       }).returning();
       let linesToInsert = [];

       for (const asset of assets) {
          const cost = parseFloat(asset.acquisitionCost || '0');
          const months = parseFloat(asset.usefulLifeMonths || '1');
          
          if (months > 0) {
             const monthlyDepreciation = cost / months;
             totalDepreciation += monthlyDepreciation;

             // Дебит: Разход за амортизация
             linesToInsert.push({
               journalId: header.id,
               accountId: asset.expenseAccountId, 
               entryType: 'debit',
               amount: monthlyDepreciation.toFixed(2),
               description: `Амортизация: ${asset.name} (Инв.№ ${asset.inventoryNumber})`
             });

             // Кредит: Натрупана амортизация
             linesToInsert.push({
               journalId: header.id,
               accountId: asset.amortizationAccountId, 
               entryType: 'credit',
               amount: monthlyDepreciation.toFixed(2),
               description: `Амортизация: ${asset.name} (Инв.№ ${asset.inventoryNumber})`
             });
             
             processedAssets++;
          }
       }

       // 3. Fallback за Сметки
       // В случай, че активът няма зададени счетоводни сметки, търсим системните по подразбиране (603 и 241)
       const defaultExpenseAccount = await db.query.accountPlan.findFirst({ where: and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, '603')) });
       const defaultAmortAccount = await db.query.accountPlan.findFirst({ where: and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, '241')) });

       for (const line of linesToInsert) {
           if (!line.accountId) {
               if (line.entryType === 'debit' && defaultExpenseAccount) line.accountId = defaultExpenseAccount.id;
               else if (line.entryType === 'credit' && defaultAmortAccount) line.accountId = defaultAmortAccount.id;
           }
       }
       
       // Филтрираме тези, които все пак нямат accountId (за да не гърми foreign key constraints)
       linesToInsert = linesToInsert.filter(l => l.accountId);

       if (linesToInsert.length > 0) {
          await db.insert(journalLines).values(linesToInsert);
       } else {
          return { success: false, message: "ДМА бяха намерени, но не можаха да бъдат осчетоводени, защото липсват настроени счетоводни сметки (напр. 603 и 241) в сметкоплана." };
       }

       return {
         success: true,
         message: `Успешно приключих амортизациите за месец ${month}/${year}!\n\nОбработени ДМА: ${processedAssets} бр.\nОбщо признат месечен разход: **${totalDepreciation.toFixed(2)} лв.**\nСъздадена е счетоводна статия #${header.journalNumber} в Главната книга.`
       };

    } catch (err: any) {
       console.error("AI Depreciate Assets Error:", err);
       return { success: false, message: `Грешка при изчисление на амортизации: ${err.message}` };
    }
  }
});
