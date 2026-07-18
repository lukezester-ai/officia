// @ts-nocheck
import { db } from '@/lib/db/db';
import { fixedAssets, depreciationRuns, depreciationLogs } from '@/lib/db/schema/fixed_assets';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * ЕПИК 2: Автоматизирани Амортизации (ДМА)
 * Изчислява и осчетоводява месечните амортизации на дълготрайните активи.
 */
export async function runMonthlyDepreciation(tenantId: string, month: string, year: string): Promise<{ success: boolean; generatedAmount?: number; message?: string; errors?: any }> {
  try {
    // 1. Проверка дали вече е пускан процесът за този месец (Защитен механизъм)
    const existingRun = await db.select().from(depreciationRuns).where(
      and(
        eq(depreciationRuns.tenantId, tenantId),
        eq(depreciationRuns.month, month),
        eq(depreciationRuns.year, year)
      )
    );

    if (existingRun.length > 0) {
      return { success: true, message: `Амортизациите за м. ${month}/${year} вече са начислени.` };
    }

    // 2. Взимаме всички активни активи (които все още имат стойност за амортизиране)
    // За MVP: предполагаме, че всички активни са в срок на годност.
    const activeAssets = await db.select().from(fixedAssets).where(
      and(
        eq(fixedAssets.tenantId, tenantId),
        eq(fixedAssets.isActive, true)
      )
    );

    if (activeAssets.length === 0) {
      return { success: true, message: 'Няма активни активи за амортизация.' };
    }

    let totalMonthlyDepreciation = 0;
    const runId = uuidv4();
    const journalHeaderId = uuidv4();
    const jLinesToInsert = [];
    const depLogsToInsert = [];

    // 3. Изчисляваме квотите и подготвяме счетоводните записи
    for (const asset of activeAssets) {
      const acquisitionCost = parseFloat(asset.acquisitionCost || '0');
      const salvageValue = parseFloat(asset.salvageValue || '0');
      const usefulLifeMonths = parseFloat(asset.usefulLifeMonths || '1');
      
      if (usefulLifeMonths <= 0) continue;

      // Линеен метод: Месечна квота = (Придобивна ст. - Остатъчна ст.) / Месеци
      let monthlyDepreciation = (acquisitionCost - salvageValue) / usefulLifeMonths;
      monthlyDepreciation = Math.round(monthlyDepreciation * 100) / 100;

      if (monthlyDepreciation > 0 && asset.expenseAccountId && asset.amortizationAccountId) {
        totalMonthlyDepreciation += monthlyDepreciation;

        // Дебит Разход (пр. 603)
        jLinesToInsert.push({
          journalId: journalHeaderId,
          accountId: asset.expenseAccountId,
          entryType: 'debit',
          amount: monthlyDepreciation.toString(),
          description: `Амортизация м.${month}/${year}: ${asset.name}`,
          currency: 'BGN',
        });

        // Кредит Амортизация (пр. 241)
        jLinesToInsert.push({
          journalId: journalHeaderId,
          accountId: asset.amortizationAccountId,
          entryType: 'credit',
          amount: monthlyDepreciation.toString(),
          description: `Амортизация м.${month}/${year}: ${asset.name}`,
          currency: 'BGN',
        });

        depLogsToInsert.push({
          runId,
          assetId: asset.id,
          amount: monthlyDepreciation.toString(),
          journalEntryId: journalHeaderId,
        });
      }
    }

    if (totalMonthlyDepreciation === 0) {
      return { success: true, message: 'Няма начислени амортизационни квоти (няма стойности).' };
    }

    // 4. Атомарна транзакция за записване на всичко едновременно
    await db.transaction(async (tx) => {
      // 4.1 Записваме Header на счетоводната статия
      await tx.insert(journalHeaders).values({
        id: journalHeaderId,
        tenantId,
        journalNumber: `DEP-${year}${month}-${Date.now().toString().slice(-4)}`,
        entryDate: new Date(), // Дата на пускане
        description: `Месечни амортизации за м.${month}/${year}`,
        documentType: 'depreciation',
        status: 'posted',
        aiStatus: 'verified',
        aiConfidence: '1.00',
        aiReasoning: 'Автоматично начислени амортизации по линеен метод спрямо инвентарната книга.'
      });

      // 4.2 Записваме Дебити и Кредити
      await tx.insert(journalLines).values(jLinesToInsert);

      // 4.3 Записваме Depreciation Run заключването
      await tx.insert(depreciationRuns).values({
        id: runId,
        tenantId,
        month,
        year,
        status: 'completed',
        totalAmount: totalMonthlyDepreciation.toString(),
      });

      // 4.4 Записваме детайлните логове по актив
      await tx.insert(depreciationLogs).values(depLogsToInsert);
    });

    return { 
      success: true, 
      generatedAmount: totalMonthlyDepreciation,
      message: `Успешно начислени амортизации в размер на ${totalMonthlyDepreciation.toFixed(2)} лв.` 
    };

  } catch (error: any) {
    console.error('[runMonthlyDepreciation] Error:', error);
    return { success: false, errors: error.message };
  }
}
