import { tool } from 'ai';
import { z } from 'zod';
import { getFinancialPeriodSummary } from '@/lib/financial/period-summary';

export const buildGetFinancialSummaryTool = (tenantId: string) => tool({
  description: "Връща обобщена финансова информация (приходи, разходи, печалба) за зададен период. Използвай го, когато потребителят попита за приходи, разходи или печалба.",
  inputSchema: z.object({
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
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (period === 'year') {
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
      } else if (!start || !end) {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      }

      const summary = await getFinancialPeriodSummary(tenantId, start, end);

      return {
        success: true,
        period: `${summary.start} - ${summary.end}`,
        revenue: summary.revenue,
        expenses: summary.expenses,
        netProfit: summary.netProfit,
        currency: summary.currency,
        message: `Финансова справка за период ${summary.start} до ${summary.end}:\n- Приходи: ${summary.revenue.toFixed(2)} ${summary.currency}\n- Разходи: ${summary.expenses.toFixed(2)} ${summary.currency}\n- Печалба: ${summary.netProfit.toFixed(2)} ${summary.currency}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error("AI Financial Summary Error:", err);
      return {
        success: false,
        message: `Грешка при извличане на финансовата справка: ${message}`,
      };
    }
  },
});
