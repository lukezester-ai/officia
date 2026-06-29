import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { expenses } from '@/lib/db/schema/expenses';
import { eq, and, sql } from 'drizzle-orm';
import { getCachedData } from '@/lib/cache/cache-manager';

export type FinancialPeriodSummary = {
  start: string;
  end: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  currency: string;
};

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export async function getFinancialPeriodSummary(
  tenantId: string,
  start: string,
  end: string,
): Promise<FinancialPeriodSummary> {
  const [salesResult] = await db
    .select({ totalRevenue: sql<number>`COALESCE(SUM(CAST(${invoices.totalAmount} AS NUMERIC)), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        sql`${invoices.issueDate} >= ${start} AND ${invoices.issueDate} <= ${end}`,
        sql`${invoices.status} IN ('paid', 'платена', 'issued', 'sent', 'издадена')`,
      ),
    );

  const [purchasesResult] = await db
    .select({ totalPurchases: sql<number>`COALESCE(SUM(CAST(${purchaseInvoices.totalAmount} AS NUMERIC)), 0)` })
    .from(purchaseInvoices)
    .where(
      and(
        eq(purchaseInvoices.tenantId, tenantId),
        sql`${purchaseInvoices.issueDate} >= ${start} AND ${purchaseInvoices.issueDate} <= ${end}`,
      ),
    );

  const [expensesResult] = await db
    .select({ totalExpenses: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS NUMERIC)), 0)` })
    .from(expenses)
    .where(
      and(
        eq(expenses.tenantId, tenantId),
        sql`${expenses.expenseDate} >= ${start}::timestamp AND ${expenses.expenseDate} <= ${end}::timestamp`,
      ),
    );

  const revenue = Number(salesResult?.totalRevenue ?? 0);
  const totalExpenses = Number(purchasesResult?.totalPurchases ?? 0) + Number(expensesResult?.totalExpenses ?? 0);

  return {
    start,
    end,
    revenue,
    expenses: totalExpenses,
    netProfit: revenue - totalExpenses,
    currency: 'EUR',
  };
}

export async function getCurrentMonthFinancialSummary(tenantId: string): Promise<FinancialPeriodSummary> {
  const { start, end } = getMonthRange();

  return getCachedData(
    `financial:monthly:${tenantId}:${start}`,
    () => getFinancialPeriodSummary(tenantId, start, end),
    300,
  );
}
