import { tool } from 'ai';
import { z } from 'zod';

export const generateReportTool = tool({
  description: "Генерира специализиран счетоводен или финансов отчет (напр. ОПР, Баланс, ДДС декларация)",
  parameters: z.object({
    reportType: z.enum(["pnl", "balance_sheet", "vat_declaration", "cash_flow"]).describe("Тип на отчета"),
    period: z.string().describe("Период за отчета (напр. 2024-05 или 2024-Q1)"),
  }),
  execute: async ({ reportType, period }) => {
    console.log("Generating report:", { reportType, period });
    
    // Mock response
    return {
      success: true,
      reportUrl: `/reports/download?type=${reportType}&period=${period}`,
      message: `Отчетът ${reportType} за период ${period} е генериран успешно и е готов за изтегляне.`,
    };
  },
});
