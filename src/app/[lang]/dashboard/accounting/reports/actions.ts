'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { ReportEngine } from '@/lib/accounting/report-engine';

export async function getReportsData(year: number) {
  try {
    const { tenantId } = await requireTenant();
    
    // Generate P&L for each month of the year to build the chart
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      
      const pnl = await ReportEngine.generatePnL(tenantId, startDate, endDate);
      
      // Math.abs is used to show positive values for expenses on the chart
      const rev = Math.abs(Number(pnl.revenue.total) || 0);
      const exp = Math.abs(Number(pnl.expenses.total) || 0);
      
      monthlyData.push({
        name: startDate.toLocaleString('bg-BG', { month: 'short' }),
        Приходи: rev,
        Разходи: exp,
        Печалба: rev - exp,
      });
    }

    // Generate year-to-date PnL
    const ytdStart = new Date(Date.UTC(year, 0, 1));
    const ytdEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const ytdPnL = await ReportEngine.generatePnL(tenantId, ytdStart, ytdEnd);

    // Generate current Balance Sheet
    const balanceSheet = await ReportEngine.generateBalanceSheet(tenantId, new Date());

    return {
      success: true,
      data: {
        monthlyData,
        ytdPnL,
        balanceSheet,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}