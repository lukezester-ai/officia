// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { eq, and, sql } from 'drizzle-orm';

export const buildGetFinancialSummaryTool = (tenantId: string) => tool({
  description: "Връща обобщена финансова информация (приходи, разходи, печалба) за зададен период. Използвай го, когато потребителят попита за приходи, разходи или печалба.",
  parameters: z.object({
    period: z.enum(["month", "quarter", "year", "custom"]).describe("Период за обобщението (напр. month за текущия месец)"),
    startDate: z.string().optional().describe("Начална дата (YYYY-MM-DD), задължителна ако period e custom"),
    endDate: z.string().optional().describe("Крайна дата (YYYY-MM-DD), задължителна ако period e custom"),
  }),
  execute: async ({ period, startDate, endDate }) => {
    try {
      let start = startDate;
      let end = endDate;
      
      const today = new Date();
      if (period === 'month') {
        // Formats exactly YYYY-MM-DD
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (period === 'year') {
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
      } else if (!start || !end) {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      }

      // 1. Приходи (Продажби)
      const salesResult = await db
        .select({ totalRevenue: sql<number>`SUM(CAST(total_amount AS NUMERIC))` })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            sql`issue_date >= ${start} AND issue_date <= ${end}`
          )
        );

      const totalRevenue = Number(salesResult[0]?.totalRevenue) || 0;

      // 2. Разходи (Покупки - Фактури)
      const purchasesResult = await db
        .select({ totalPurchases: sql<number>`SUM(CAST(total_amount AS NUMERIC))` })
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, tenantId),
            sql`issue_date >= ${start} AND issue_date <= ${end}`
          )
        );
        
      const totalPurchases = Number(purchasesResult[0]?.totalPurchases) || 0;
      
      // 3. Други Разходи (Expenses таблица)
      const expensesResult = await db
        .select({ totalExpenses: sql<number>`SUM(CAST(amount AS NUMERIC))` })
        .from(expenses)
        .where(
          and(
            eq(expenses.tenantId, tenantId),
            sql`expense_date >= ${start}::timestamp AND expense_date <= ${end}::timestamp`
          )
        );
        
      const directExpenses = Number(expensesResult[0]?.totalExpenses) || 0;

      const totalExpenses = totalPurchases + directExpenses;
      const netProfit = totalRevenue - totalExpenses;

      return {
        success: true,
        period: `${start} - ${end}`,
        revenue: totalRevenue,
        expenses: totalExpenses,
        netProfit: netProfit,
        currency: "BGN",
        message: `Финансова справка за период ${start} до ${end}:\n- Приходи: ${totalRevenue.toFixed(2)} лв.\n- Разходи: ${totalExpenses.toFixed(2)} лв.\n- Печалба: ${netProfit.toFixed(2)} лв.`,
      };
    } catch (err: any) {
      console.error("AI Financial Summary Error:", err);
      return {
        success: false,
        message: `Грешка при извличане на финансовата справка: ${err.message}`
      };
    }
  },
});
