// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';

export const generateReportTool = tool({
  description: "Генерира специализиран счетоводен или финансов отчет (напр. ОПР, Баланс, ДДС декларация)",
  parameters: z.object({
    reportType: z.enum(["pnl", "balance_sheet", "vat_declaration", "cash_flow"]).describe("Тип на отчета"),
    period: z.string().describe("Период за отчета (напр. 2024-05 или 2024-Q1)"),
  }),
  execute: async ({ reportType, period }) => {
    return {
      success: false,
      message: `Не генерирам фиктивен файл за ${reportType} (${period}). Отворете модула Отчети / ДДС в таблото за реални данни.`,
    };
  },
});
