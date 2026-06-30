// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, and, inArray } from 'drizzle-orm';

export const buildBankMatchTool = (tenantId: string) => tool({
  description: "Автоматично сканира всички несъпоставени (unreconciled) банкови транзакции и ги засича с отворени неплатени фактури. Използвай го, когато потребителят попита дали има платени фактури или поиска банково засичане.",
  parameters: z.object({
    confidenceThreshold: z.number().optional().default(0.80).describe("Минимален праг за съвпадение (0-1). По подразбиране е 0.80.")
  }),
  execute: async ({ confidenceThreshold }) => {
    try {
      // 1. Вземаме всички банкови сметки на фирмата
      const accounts = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId));
      if (accounts.length === 0) {
        return { success: true, message: "Не бяха открити банкови сметки за тази фирма в системата.", matched: 0 };
      }
      const accountIds = accounts.map(a => a.id);

      // 2. Вземаме всички несъпоставени банкови преводи
      const unReconciledTxs = await db.select()
        .from(bankTransactions)
        .where(
          and(
            inArray(bankTransactions.accountId, accountIds),
            eq(bankTransactions.isReconciled, false)
          )
        );

      // Филтрираме само входящите преводи (положителна сума)
      const incomingTxs = unReconciledTxs.filter(tx => parseFloat(tx.amount || '0') > 0);

      if (incomingTxs.length === 0) {
        return { success: true, message: "Няма чакащи входящи преводи за съпоставяне. Всичко е изчистено!", matched: 0 };
      }

      // 3. Вземаме всички отворени (неплатени) фактури
      const allInvoices = await db.select()
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId));
        
      const openInvoices = allInvoices.filter(i => i.status !== 'paid' && i.type === 'sale');

      if (openInvoices.length === 0) {
        return { success: true, message: `Намерени са ${incomingTxs.length} превода, но нямате неплатени фактури, с които да ги засечем.`, matched: 0 };
      }

      // 4. Алгоритъм за съпоставяне (Match)
      let matchCount = 0;
      const matchedDetails = [];

      for (const tx of incomingTxs) {
        const txAmount = parseFloat(tx.amount || '0');
        const txDesc = (tx.description || '').toLowerCase();
        
        let bestMatch = null;
        let highestScore = 0;

        for (const inv of openInvoices) {
           const invAmount = parseFloat(inv.totalAmount || '0');
           let score = 0;
           
           // Точно съвпадение на сумата дава най-голяма тежест
           if (Math.abs(txAmount - invAmount) < 0.01) {
             score += 0.6;
           }

           // Проверка дали номерът на фактурата е в основанието за плащане
           if (inv.invoiceNumber && txDesc.includes(inv.invoiceNumber.toLowerCase())) {
             score += 0.4;
           }

           // Проверка на името на контрагента
           if (inv.clientName && tx.counterpartyName && tx.counterpartyName.toLowerCase().includes(inv.clientName.toLowerCase())) {
             score += 0.2;
           }

           if (score > highestScore) {
             highestScore = score;
             bestMatch = inv;
           }
        }

        // Ако намерим добро съвпадение
        if (bestMatch && highestScore >= confidenceThreshold) {
          // Отбелязваме в базата
          await db.update(bankTransactions)
            .set({ 
               isReconciled: true, 
               matchedInvoiceId: bestMatch.id,
               matchStatus: 'confirmed',
               matchConfidence: highestScore.toString()
            })
            .where(eq(bankTransactions.id, tx.id));
            
          await db.update(invoices)
            .set({ status: 'paid' })
            .where(eq(invoices.id, bestMatch.id));
            
          matchCount++;
          matchedDetails.push(`Фактура №${bestMatch.invoiceNumber} (${bestMatch.totalAmount} лв.) беше платена чрез превод от ${tx.counterpartyName || 'Неизвестен'}`);
          
          // Премахваме фактурата от списъка за да не се плати два пъти с два превода
          const index = openInvoices.findIndex(i => i.id === bestMatch.id);
          if (index > -1) openInvoices.splice(index, 1);
        }
      }

      return {
        success: true,
        matched: matchCount,
        message: matchCount > 0 
           ? `Успешно съпоставих ${matchCount} плащания:\n` + matchedDetails.map(m => `- ${m}`).join('\n')
           : `Сканирах ${incomingTxs.length} превода и ${openInvoices.length} отворени фактури, но не намерих сигурни съвпадения.`,
      };

    } catch (err: any) {
      console.error("AI Bank Match Error:", err);
      return { success: false, message: `Грешка при банково засичане: ${err.message}` };
    }
  }
});
