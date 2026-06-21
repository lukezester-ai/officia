// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { eq, and, sql } from 'drizzle-orm';

export const buildGenerateVatTool = (tenantId: string) => tool({
  description: "Автоматичен генератор на ДДС дневници. Използвай го, когато потребителят иска да приключи месеца, да сметне ДДС-то или да генерира данъчни/ДДС дневници.",
  parameters: z.object({
    year: z.number().describe("Година (напр. 2024)"),
    month: z.number().describe("Месец (от 1 до 12)"),
  }),
  execute: async ({ year, month }) => {
     try {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        // 1. Вземаме всички продажби за месеца (Дневник на продажбите)
        const sales = await db.select()
          .from(invoices)
          .where(
            and(
              eq(invoices.tenantId, tenantId),
              sql`${invoices.issueDate} >= ${startDate} AND ${invoices.issueDate} <= ${endDate}`
            )
          );

        // 2. Вземаме всички покупки за месеца (Дневник на покупките)
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

        // 3. Изчистваме старите записи за този месец/година (за да можем да генерираме наново без дублажи)
        await db.delete(vatJournals).where(
          and(
            eq(vatJournals.tenantId, tenantId),
            eq(vatJournals.periodYear, year),
            eq(vatJournals.periodMonth, month)
          )
        );

        let totalVatSales = 0;
        let totalVatPurchases = 0;
        const journalsToInsert = [];

        // 4. Подготвяме записите за Продажбите
        for (const s of sales) {
           const vat = parseFloat(s.vatAmount || '0');
           totalVatSales += vat;
           journalsToInsert.push({
             tenantId,
             type: 'sales',
             periodYear: year,
             periodMonth: month,
             entryDate: new Date(),
             documentNumber: s.invoiceNumber,
             counterpartyName: s.clientName,
             counterpartyVat: s.clientVat,
             invoiceNumber: s.invoiceNumber,
             invoiceDate: s.issueDate,
             netAmount: s.netAmount,
             vatAmount: s.vatAmount,
             totalAmount: s.totalAmount,
             vatRate: 20 // Опростяване за примера
           });
        }

        // 5. Подготвяме записите за Покупки
        for (const p of purchases) {
           const vat = parseFloat(p.vatAmount || '0');
           totalVatPurchases += vat;
           journalsToInsert.push({
             tenantId,
             type: 'purchases',
             periodYear: year,
             periodMonth: month,
             entryDate: new Date(),
             documentNumber: p.invoiceNumber,
             counterpartyName: p.supplierName,
             counterpartyVat: p.supplierVat,
             invoiceNumber: p.invoiceNumber,
             invoiceDate: p.issueDate,
             netAmount: p.netAmount,
             vatAmount: p.vatAmount,
             totalAmount: p.totalAmount,
             vatRate: 20
           });
        }

        // 6. Запис в таблицата
        if (journalsToInsert.length > 0) {
           await db.insert(vatJournals).values(journalsToInsert);
        }

        const resultVat = totalVatSales - totalVatPurchases;
        const resultText = resultVat > 0 
            ? `🔴 ДДС за внасяне: **${resultVat.toFixed(2)} лв.**` 
            : `🟢 ДДС за възстановяване: **${Math.abs(resultVat).toFixed(2)} лв.**`;

        return {
           success: true,
           message: `Успешно приключих месец ${month}/${year} и генерирах ДДС дневниците!\n\nОбработени са ${sales.length} продажби и ${purchases.length} покупки.\n\n📊 Данъчен резултат:\n- Начислено ДДС (Продажби): ${totalVatSales.toFixed(2)} лв.\n- Данъчен кредит (Покупки): ${totalVatPurchases.toFixed(2)} лв.\n- ${resultText}`
        };

     } catch (err: any) {
        console.error("AI Generate VAT Error:", err);
        return { success: false, message: `Грешка при генериране на ДДС дневници: ${err.message}` };
     }
  }
});
