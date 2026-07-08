import { db } from '@/lib/db/db';
import { journalLines, journalHeaders } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

type AccountBalanceRow = {
  accountId: string | null;
  accountCode: string | null;
  accountName: string | null;
  type: string | null;
  balance: number | null;
};

type GroupedAccounts = Record<string, Array<AccountBalanceRow & { balance: number }>>;

export class ReportEngine {
  static async generateBalanceSheet(tenantId: string, asOf: Date) {
    const balances = await this.calculateAccountBalances(tenantId, asOf);

    const assets = balances.filter((a) => a.type === 'asset');
    const liabilities = balances.filter((a) => a.type === 'liability');
    const equity = balances.filter((a) => a.type === 'equity');

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
      netProfit: revenue - expenses,
    };
  }

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

  private static async calculateAccountBalances(tenantId: string, asOf: Date) {
    return await db
      .select({
        accountId: journalLines.accountId,
        accountCode: accountPlan.accountNumber,
        accountName: accountPlan.name,
        type: accountPlan.type,
        balance: sql<number>`SUM(CASE WHEN ${journalLines.entryType}::text = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(and(eq(journalHeaders.tenantId, tenantId), eq(journalHeaders.status, 'posted'), lte(journalHeaders.entryDate, asOf)))
      .groupBy(journalLines.accountId, accountPlan.accountNumber, accountPlan.name, accountPlan.type);
  }

  private static async sumByAccountType(tenantId: string, type: string, start: Date, end: Date) {
    const result = await db
      .select({
        total: sql<number>`SUM(CASE WHEN ${journalLines.entryType}::text = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(
        and(
          eq(journalHeaders.tenantId, tenantId),
          eq(journalHeaders.status, 'posted'),
          eq(accountPlan.type, type),
          gte(journalHeaders.entryDate, start),
          lte(journalHeaders.entryDate, end),
        ),
      );

    return result[0]?.total ? Number(result[0].total) : 0;
  }

  private static async getBreakdown(tenantId: string, type: string, start: Date, end: Date) {
    return await db
      .select({
        accountCode: accountPlan.accountNumber,
        accountName: accountPlan.name,
        amount: sql<number>`SUM(CASE WHEN ${journalLines.entryType}::text = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(
        and(
          eq(journalHeaders.tenantId, tenantId),
          eq(journalHeaders.status, 'posted'),
          eq(accountPlan.type, type),
          gte(journalHeaders.entryDate, start),
          lte(journalHeaders.entryDate, end),
        ),
      )
      .groupBy(accountPlan.accountNumber, accountPlan.name);
  }

  private static groupAccountsByCategory(accountsArr: AccountBalanceRow[]): GroupedAccounts {
    const grouped: GroupedAccounts = {};
    accountsArr.forEach((acc) => {
      const category = acc.accountCode ? acc.accountCode.substring(0, 1) : 'Unknown';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({
        ...acc,
        balance: Number(acc.balance ?? 0),
      });
    });
    return grouped;
  }

  private static sumBalances(items: AccountBalanceRow[]) {
    return items.reduce((sum, item) => sum + Math.abs(Number(item.balance) || 0), 0);
  }

  private static async calculateOperatingCashFlow(_tenantId: string, _start: Date, _end: Date) {
    return 0;
  }

  private static async calculateInvestingCashFlow(_tenantId: string, _start: Date, _end: Date) {
    return 0;
  }

  private static async calculateFinancingCashFlow(_tenantId: string, _start: Date, _end: Date) {
    return 0;
  }
}
