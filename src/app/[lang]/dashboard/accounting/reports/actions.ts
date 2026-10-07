'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { ReportEngine } from '@/lib/accounting/report-engine';

export async function getReportsData(year: number) {
  try {
    const { tenantId } = await requireTenant();
    const rows = await ReportEngine.monthlyTypeTotals(tenantId, year);

    const monthlyData = Array.from({ length: 12 }, (_, index) => ({
      name: new Date(Date.UTC(year, index, 1)).toLocaleString('bg-BG', { month: 'short' }),
      Приходи: 0,
      Разходи: 0,
      Печалба: 0,
    }));
    let revenueTotal = 0;
    let expenseTotal = 0;
    for (const row of rows) {
      const month = Number(row.month);
      if (month < 1 || month > 12) continue;
      const total = Number(row.total) || 0;
      const slot = monthlyData[month - 1];
      if (row.type === 'revenue') {
        slot.Приходи = Math.abs(total);
        revenueTotal += total;
      } else if (row.type === 'expense') {
        slot.Разходи = Math.abs(total);
        expenseTotal += total;
      }
    }
    for (const slot of monthlyData) slot.Печалба = slot.Приходи - slot.Разходи;

    const ytdPnL = {
      revenue: { total: revenueTotal },
      expenses: { total: expenseTotal },
    };

    return {
      success: true,
      data: {
        monthlyData,
        ytdPnL,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}