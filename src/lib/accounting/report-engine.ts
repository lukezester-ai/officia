import { db } from '@/lib/db';
import { journalLines, journalHeaders } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export class ReportEngine {

  // ==================== БАЛАНС ====================
  static async generateBalanceSheet(tenantId: string, asOf: Date) {
    const balances = await this.calculateAccountBalances(tenantId, asOf);

    const assets = balances.filter((a: any) => a.type === 'asset');
    const liabilities = balances.filter((a: any) => a.type === 'liability');
    const equity = balances.filter((a: any) => a.type === 'equity');

    return {
      asOf,
      assets: this.groupAccountsByCategory(assets),
      liabilities: this.groupAccountsByCategory(liabilities),
      equity: this.groupAccountsByCategory(equity),
      totalAssets: this.sumBalances(assets),
      totalLiabilities: this.sumBalances(liabilities),
      totalEquity: this.sumBalances(equity),
      totalLiabilitiesAndEquity: this.sumBalances([...liabilities, ...equity]),
    };
  }

  // ==================== P&L (Приходи и Разходи) ====================
  static async generatePnL(tenantId: string, startDate: Date, endDate: Date) {
    const revenue = await this.sumByAccountType(tenantId, 'revenue', startDate, endDate);
    const expenses = await this.sumByAccountType(tenantId, 'expense', startDate, endDate);

    return {
      period: { start: startDate, end: endDate },
      revenue: {
        total: revenue,
        breakdown: await this.getBreakdown(tenantId, 'revenue', startDate, endDate),
      },
      expenses: {
        total: expenses,
        breakdown: await this.getBreakdown(tenantId, 'expense', startDate, endDate),
      },
      grossProfit: revenue - expenses,
      netProfit: revenue - expenses, // може да се разшири с други
    };
  }

  // ==================== Cash Flow ====================
  static async generateCashFlow(tenantId: string, startDate: Date, endDate: Date) {
    const operating = await this.calculateOperatingCashFlow(tenantId, startDate, endDate);
    const investing = await this.calculateInvestingCashFlow(tenantId, startDate, endDate);
    const financing = await this.calculateFinancingCashFlow(tenantId, startDate, endDate);

    return {
      period: { start: startDate, end: endDate },
      operating,
      investing,
      financing,
      netCashFlow: operating + investing + financing,
    };
  }

  // ==================== Помощни методи ====================

  private static async calculateAccountBalances(tenantId: string, asOf: Date) {
    return await db
      .select({
        accountId: journalLines.accountId,
        accountCode: accountPlan.accountNumber,
        accountName: accountPlan.name,
        type: accountPlan.type,
        // Drizzle numeric amounts can be summed conditionally based on entryType ('debit' | 'credit')
        balance: sql<number>`SUM(CASE WHEN ${journalLines.entryType} = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(and(
        eq(journalHeaders.tenantId, tenantId),
        lte(journalHeaders.entryDate, asOf)
      ))
      .groupBy(journalLines.accountId, accountPlan.accountNumber, accountPlan.name, accountPlan.type);
  }

  private static async sumByAccountType(tenantId: string, type: string, start: Date, end: Date) {
    const result = await db
      .select({ 
        total: sql<number>`SUM(CASE WHEN ${journalLines.entryType} = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)` 
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(and(
        eq(journalHeaders.tenantId, tenantId),
        eq(accountPlan.type, type),
        gte(journalHeaders.entryDate, start),
        lte(journalHeaders.entryDate, end)
      ));

    return result[0]?.total ? Number(result[0].total) : 0;
  }

  private static async getBreakdown(tenantId: string, type: string, start: Date, end: Date) {
    return await db
      .select({
        accountCode: accountPlan.accountNumber,
        accountName: accountPlan.name,
        amount: sql<number>`SUM(CASE WHEN ${journalLines.entryType} = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(and(
        eq(journalHeaders.tenantId, tenantId),
        eq(accountPlan.type, type),
        gte(journalHeaders.entryDate, start),
        lte(journalHeaders.entryDate, end)
      ))
      .groupBy(accountPlan.accountNumber, accountPlan.name);
  }

  private static groupAccountsByCategory(accountsArr: any[]) {
    const grouped: any = {};
    accountsArr.forEach(acc => {
      const category = acc.accountCode ? acc.accountCode.substring(0, 1) : 'Unknown'; // 1xx, 2xx и т.н.
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({
        ...acc,
        balance: Number(acc.balance)
      });
    });
    return grouped;
  }

  private static sumBalances(items: any[]) {
    return items.reduce((sum, item) => sum + Math.abs(Number(item.balance) || 0), 0);
  }

  // Cash Flow помощни методи (може да се разширят)
  private static async calculateOperatingCashFlow(tenantId: string, start: Date, end: Date) { return 0; }
  private static async calculateInvestingCashFlow(tenantId: string, start: Date, end: Date) { return 0; }
  private static async calculateFinancingCashFlow(tenantId: string, start: Date, end: Date) { return 0; }
}
