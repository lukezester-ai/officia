import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { fiscalYears, accountingPeriods } from '@/lib/db/schema/fiscal_periods';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';

type BreakdownRow = { accountCode: string; accountName: string; amount: number };

type ClosingLine = { account: string; description: string; debit: number; credit: number };

export type ClosingPreview = {
  revenueBreakdown: BreakdownRow[];
  expenseBreakdown: BreakdownRow[];
  netProfit: number;
  lines: ClosingLine[];
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
};

export type CloseResult = {
  journalNumber: string;
  journalId: string;
  linesCount: number;
  netProfit: number;
};

export type PeriodInfo = {
  periodId: string;
  fiscalYearId: string;
  year: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: string;
  fiscalYearStatus: string;
};

export class PeriodCloser {
  static async getPeriods(tenantId: string): Promise<PeriodInfo[]> {
    const rows = await db
      .select({
        periodId: accountingPeriods.id,
        fiscalYearId: accountingPeriods.fiscalYearId,
        year: fiscalYears.year,
        periodNumber: accountingPeriods.periodNumber,
        startDate: accountingPeriods.startDate,
        endDate: accountingPeriods.endDate,
        status: accountingPeriods.status,
        fiscalYearStatus: fiscalYears.status,
      })
      .from(accountingPeriods)
      .innerJoin(fiscalYears, eq(accountingPeriods.fiscalYearId, fiscalYears.id))
      .where(eq(fiscalYears.tenantId, tenantId))
      .orderBy(fiscalYears.year, accountingPeriods.periodNumber);

    return rows.map((r) => ({
      periodId: r.periodId,
      fiscalYearId: r.fiscalYearId,
      year: r.year,
      periodNumber: r.periodNumber,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status ?? 'open',
      fiscalYearStatus: r.fiscalYearStatus ?? 'open',
    }));
  }

  static async getClosingPreview(tenantId: string, periodId: string): Promise<ClosingPreview> {
    const period = await this.getPeriodById(tenantId, periodId);
    if (!period) throw new Error('Period not found');

    const start = new Date(period.startDate);
    const end = new Date(period.endDate + 'T23:59:59.999Z');

    const revenueBreakdown = await this.getBreakdownByType(tenantId, 'revenue', start, end);
    const expenseBreakdown = await this.getBreakdownByType(tenantId, 'expense', start, end);

    const totalRevenue = revenueBreakdown.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenseBreakdown.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const lines: ClosingLine[] = [];

    for (const rev of revenueBreakdown) {
      lines.push({ account: rev.accountCode, description: rev.accountName, debit: rev.amount, credit: 0 });
    }
    if (totalRevenue > 0) {
      lines.push({ account: '121', description: 'Печалби и загуби (приходи)', debit: 0, credit: totalRevenue });
    }

    if (totalExpenses > 0) {
      lines.push({ account: '121', description: 'Печалби и загуби (разходи)', debit: totalExpenses, credit: 0 });
    }
    for (const exp of expenseBreakdown) {
      lines.push({ account: exp.accountCode, description: exp.accountName, debit: 0, credit: exp.amount });
    }

    if (netProfit > 0) {
      lines.push({ account: '121', description: 'Печалби и загуби (резултат)', debit: netProfit, credit: 0 });
      lines.push({ account: '111', description: 'Неразпределена печалба', debit: 0, credit: netProfit });
    } else if (netProfit < 0) {
      const loss = Math.abs(netProfit);
      lines.push({ account: '122', description: 'Загуба', debit: loss, credit: 0 });
      lines.push({ account: '121', description: 'Печалби и загуби (резултат)', debit: 0, credit: loss });
    }

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    return { revenueBreakdown, expenseBreakdown, netProfit, lines, balanced: totalDebit === totalCredit, totalDebit, totalCredit };
  }

  static async closePeriod(tenantId: string, periodId: string, userId: string): Promise<CloseResult> {
    const period = await this.getPeriodById(tenantId, periodId);
    if (!period) throw new Error('Period not found');
    if (period.status === 'closed') throw new Error('Period is already closed');
    if (period.fiscalYearStatus === 'closed' || period.fiscalYearStatus === 'locked') throw new Error('Fiscal year is closed or locked');

    const preview = await this.getClosingPreview(tenantId, periodId);
    if (!preview.balanced) throw new Error('Closing entry is not balanced');

    const journalNumber = `CLOSE-${period.year}-${String(period.periodNumber).padStart(2, '0')}-${Date.now()}`;
    const entryDate = new Date(period.endDate + 'T23:59:59.999Z');

    const [header] = await db
      .insert(journalHeaders)
      .values({
        tenantId,
        journalNumber,
        entryDate,
        description: `Приключване на период ${period.periodNumber}/${period.year}`,
        documentType: 'period_close',
        status: 'posted',
        postedBy: userId,
        postedAt: new Date(),
      })
      .returning();

    const lineValues: Array<typeof journalLines.$inferInsert> = [];

    for (const line of preview.lines) {
      const accountId = await this.getAccountId(tenantId, line.account);
      if (!accountId) {
        throw new Error(`Липсва сметка ${line.account} в сметкоплана`);
      }

      if (line.debit > 0) {
        lineValues.push({
          journalId: header.id,
          accountId,
          entryType: 'debit',
          amount: line.debit.toFixed(2),
          description: line.description,
        });
      }

      if (line.credit > 0) {
        lineValues.push({
          journalId: header.id,
          accountId,
          entryType: 'credit',
          amount: line.credit.toFixed(2),
          description: line.description,
        });
      }
    }

    if (lineValues.length === 0) {
      await db.delete(journalHeaders).where(eq(journalHeaders.id, header.id));
      throw new Error('Няма записани редове за приключване');
    }

    await db.insert(journalLines).values(lineValues);

    await db
      .update(accountingPeriods)
      .set({ status: 'closed', lockedAt: new Date() })
      .where(eq(accountingPeriods.id, periodId));

    return { journalNumber, journalId: header.id, linesCount: lineValues.length, netProfit: preview.netProfit };
  }

  static async reopenPeriod(tenantId: string, periodId: string): Promise<void> {
    const period = await this.getPeriodById(tenantId, periodId);
    if (!period) throw new Error('Period not found');
    if (period.status !== 'closed') throw new Error('Period is not closed');

    await db
      .update(accountingPeriods)
      .set({ status: 'open', lockedAt: null })
      .where(eq(accountingPeriods.id, periodId));
  }

  private static async getPeriodById(tenantId: string, periodId: string) {
    const [row] = await db
      .select({
        periodId: accountingPeriods.id,
        fiscalYearId: accountingPeriods.fiscalYearId,
        year: fiscalYears.year,
        periodNumber: accountingPeriods.periodNumber,
        startDate: accountingPeriods.startDate,
        endDate: accountingPeriods.endDate,
        status: accountingPeriods.status,
        fiscalYearStatus: fiscalYears.status,
      })
      .from(accountingPeriods)
      .innerJoin(fiscalYears, eq(accountingPeriods.fiscalYearId, fiscalYears.id))
      .where(and(eq(accountingPeriods.id, periodId), eq(fiscalYears.tenantId, tenantId)))
      .limit(1);

    return row || null;
  }

  private static async getBreakdownByType(tenantId: string, type: string, start: Date, end: Date): Promise<BreakdownRow[]> {
    const rows = await db
      .select({
        accountCode: accountPlan.accountNumber,
        accountName: accountPlan.name,
        amount: sql<number>`SUM(CASE WHEN ${journalLines.entryType}::text = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
      })
      .from(journalLines)
      .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
      .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
      .where(and(eq(journalHeaders.tenantId, tenantId), eq(journalHeaders.status, 'posted'), eq(accountPlan.type, type), gte(journalHeaders.entryDate, start), lte(journalHeaders.entryDate, end)))
      .groupBy(accountPlan.accountNumber, accountPlan.name);

    return rows.map((r) => ({ accountCode: r.accountCode!, accountName: r.accountName!, amount: Number(r.amount || 0) }));
  }

  private static async getAccountId(tenantId: string, accountNumber: string) {
    const [account] = await db
      .select({ id: accountPlan.id })
      .from(accountPlan)
      .where(and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, accountNumber)))
      .limit(1);

    return account?.id ?? null;
  }
}
