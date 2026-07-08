import { db } from '@/lib/db/db';
import { journalLines, journalHeaders } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

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
    const d = await this.generateCashFlowDetailed(tenantId, startDate, endDate);
    return {
      period: { start: startDate, end: endDate },
      operating: d.operating.total,
      investing: d.investing.total,
      financing: d.financing.total,
      netCashFlow: d.netCashFlow,
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

  static async generateCashFlowDetailed(tenantId: string, startDate: Date, endDate: Date) {
    const netProfit = await this.calcNetProfit(tenantId, startDate, endDate);
    const depreciation = await this.sumByAccountCodes(tenantId, ['603'], startDate, endDate);
    const receivables = await this.balanceChange(tenantId, ['411'], startDate, endDate);
    const payables = await this.balanceChange(tenantId, ['401'], startDate, endDate);
    const vatPurchases = await this.balanceChange(tenantId, ['4531'], startDate, endDate);
    const vatSales = await this.balanceChange(tenantId, ['4532'], startDate, endDate);

    const operatingActivity =
      netProfit +
      Math.abs(depreciation) +
      receivables.change +
      payables.change +
      vatPurchases.change +
      vatSales.change;

    const fixedAssetPurchases = await this.sumByAccountCodes(tenantId, ['201', '204'], startDate, endDate);
    const investingActivity = -Math.abs(fixedAssetPurchases);

    const loansChange = await this.balanceChange(tenantId, ['151'], startDate, endDate);
    const capitalChange = await this.balanceChange(tenantId, ['101'], startDate, endDate);
    const financingActivity = loansChange.change + capitalChange.change;

    const endingCash = await this.sumByAccountCodesBalances(tenantId, ['501', '503'], endDate);
    const startingCash = await this.sumByAccountCodesBalances(tenantId, ['501', '503'], new Date(startDate.getTime() - 86400000));

    return {
      period: { start: startDate, end: endDate },
      netProfit,
      depreciation: Math.abs(depreciation),
      workingCapital: {
        receivables: { start: receivables.startBalance, end: receivables.endBalance, change: receivables.change },
        payables: { start: payables.startBalance, end: payables.endBalance, change: payables.change },
        vatPurchases: { start: vatPurchases.startBalance, end: vatPurchases.endBalance, change: vatPurchases.change },
        vatSales: { start: vatSales.startBalance, end: vatSales.endBalance, change: vatSales.change },
      },
      operating: { total: operatingActivity },
      investing: { total: investingActivity, fixedAssets: Math.abs(fixedAssetPurchases) },
      financing: { total: financingActivity, loans: loansChange.change, capital: capitalChange.change },
      netCashFlow: operatingActivity + investingActivity + financingActivity,
      cash: { start: startingCash, end: endingCash, change: endingCash - startingCash },
    };
  }

  private static async calcNetProfit(tenantId: string, start: Date, end: Date) {
    const revenue = await this.sumByAccountType(tenantId, 'revenue', start, end);
    const expenses = await this.sumByAccountType(tenantId, 'expense', start, end);
    return revenue - expenses;
  }

  private static async sumByAccountCodes(tenantId: string, codes: string[], start: Date, end: Date) {
    const rows = await db
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
          inArray(accountPlan.accountNumber, codes),
          gte(journalHeaders.entryDate, start),
          lte(journalHeaders.entryDate, end),
        ),
      );
    return rows[0]?.total ? Number(rows[0].total) : 0;
  }

  private static async sumByAccountCodesBalances(tenantId: string, codes: string[], asOf: Date) {
    const rows = await db
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
          inArray(accountPlan.accountNumber, codes),
          lte(journalHeaders.entryDate, asOf),
        ),
      );
    return rows[0]?.total ? Number(rows[0].total) : 0;
  }

  private static async balanceChange(tenantId: string, codes: string[], start: Date, end: Date) {
    const startBalance = await this.sumByAccountCodesBalances(tenantId, codes, new Date(start.getTime() - 86400000));
    const endBalance = await this.sumByAccountCodesBalances(tenantId, codes, end);
    return { startBalance, endBalance, change: endBalance - startBalance };
  }

}
