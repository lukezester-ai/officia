'use server';

import { db } from '@/lib/db/db';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, and, sql } from 'drizzle-orm';

async function getTenant() {
  const [tenant] = await db.select().from(tenants).limit(1);
  return tenant;
}

export async function getTrialBalance(year?: number) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: [] };

    const data = await db
      .select({
        accountNumber: accountPlan.accountNumber,
        accountName: accountPlan.name,
        accountType: accountPlan.type,
        debitTotal: sql<string>`COALESCE(SUM(CASE WHEN ${journalLines.entryType} = 'debit' AND ${journalHeaders.status} = 'posted' THEN ${journalLines.amount}::numeric ELSE 0 END), 0)`,
        creditTotal: sql<string>`COALESCE(SUM(CASE WHEN ${journalLines.entryType} = 'credit' AND ${journalHeaders.status} = 'posted' THEN ${journalLines.amount}::numeric ELSE 0 END), 0)`,
      })
      .from(accountPlan)
      .leftJoin(journalLines, eq(journalLines.accountId, accountPlan.id))
      .leftJoin(journalHeaders, eq(journalHeaders.id, journalLines.journalId))
      .where(eq(accountPlan.tenantId, tenant.id))
      .groupBy(accountPlan.id, accountPlan.accountNumber, accountPlan.name, accountPlan.type)
      .orderBy(accountPlan.accountNumber);

    const rows = data.map(r => {
      const debit = parseFloat(r.debitTotal);
      const credit = parseFloat(r.creditTotal);
      const balance = ['liability', 'equity', 'income'].includes(r.accountType || '') ? credit - debit : debit - credit;
      return { ...r, debitTotal: debit, creditTotal: credit, balance };
    });

    return { success: true, data: rows };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function getProfitAndLoss(year?: number) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: null };
    const targetYear = year || new Date().getFullYear();

    const data = await db
      .select({
        accountNumber: accountPlan.accountNumber,
        accountName: accountPlan.name,
        accountType: accountPlan.type,
        total: sql<string>`COALESCE(SUM(CASE WHEN ${journalHeaders.status} = 'posted' AND EXTRACT(YEAR FROM ${journalHeaders.entryDate}) = ${targetYear} THEN CASE WHEN ${journalLines.entryType} = 'credit' THEN ${journalLines.amount}::numeric WHEN ${journalLines.entryType} = 'debit' THEN -${journalLines.amount}::numeric ELSE 0 END ELSE 0 END), 0)`,
      })
      .from(accountPlan)
      .leftJoin(journalLines, eq(journalLines.accountId, accountPlan.id))
      .leftJoin(journalHeaders, eq(journalHeaders.id, journalLines.journalId))
      .where(and(eq(accountPlan.tenantId, tenant.id), sql`${accountPlan.type} IN ('income', 'expense')`))
      .groupBy(accountPlan.id, accountPlan.accountNumber, accountPlan.name, accountPlan.type)
      .orderBy(accountPlan.accountNumber);

    const incomeRows = data.filter(r => r.accountType === 'income').map(r => ({ ...r, total: parseFloat(r.total) }));
    const expenseRows = data.filter(r => r.accountType === 'expense').map(r => ({ ...r, total: Math.abs(parseFloat(r.total)) }));
    const totalIncome = incomeRows.reduce((s, r) => s + r.total, 0);
    const totalExpenses = expenseRows.reduce((s, r) => s + r.total, 0);

    return { success: true, data: { year: targetYear, incomeRows, expenseRows, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses } };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

export async function getBalanceSheet() {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: null };

    const data = await db
      .select({
        accountNumber: accountPlan.accountNumber,
        accountName: accountPlan.name,
        accountType: accountPlan.type,
        debitTotal: sql<string>`COALESCE(SUM(CASE WHEN ${journalLines.entryType} = 'debit' AND ${journalHeaders.status} = 'posted' THEN ${journalLines.amount}::numeric ELSE 0 END), 0)`,
        creditTotal: sql<string>`COALESCE(SUM(CASE WHEN ${journalLines.entryType} = 'credit' AND ${journalHeaders.status} = 'posted' THEN ${journalLines.amount}::numeric ELSE 0 END), 0)`,
      })
      .from(accountPlan)
      .leftJoin(journalLines, eq(journalLines.accountId, accountPlan.id))
      .leftJoin(journalHeaders, eq(journalHeaders.id, journalLines.journalId))
      .where(and(eq(accountPlan.tenantId, tenant.id), sql`${accountPlan.type} IN ('asset', 'liability', 'equity')`))
      .groupBy(accountPlan.id, accountPlan.accountNumber, accountPlan.name, accountPlan.type)
      .orderBy(accountPlan.accountNumber);

    const assetRows = data.filter(r => r.accountType === 'asset').map(r => ({ accountNumber: r.accountNumber, accountName: r.accountName, balance: parseFloat(r.debitTotal) - parseFloat(r.creditTotal) }));
    const liabilityRows = data.filter(r => r.accountType === 'liability').map(r => ({ accountNumber: r.accountNumber, accountName: r.accountName, balance: parseFloat(r.creditTotal) - parseFloat(r.debitTotal) }));
    const equityRows = data.filter(r => r.accountType === 'equity').map(r => ({ accountNumber: r.accountNumber, accountName: r.accountName, balance: parseFloat(r.creditTotal) - parseFloat(r.debitTotal) }));

    return { success: true, data: { assetRows, liabilityRows, equityRows, totalAssets: assetRows.reduce((s, r) => s + r.balance, 0), totalLiabilities: liabilityRows.reduce((s, r) => s + r.balance, 0), totalEquity: equityRows.reduce((s, r) => s + r.balance, 0), asOf: new Date().toLocaleDateString('bg-BG') } };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

export async function getVATReport(year: number, month: number) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: null };

    const [salesRow] = await db
      .select({ netAmount: sql<string>`COALESCE(SUM(${vatJournals.netAmount}::numeric), 0)`, vatAmount: sql<string>`COALESCE(SUM(${vatJournals.vatAmount}::numeric), 0)` })
      .from(vatJournals)
      .where(and(eq(vatJournals.tenantId, tenant.id), eq(vatJournals.type, 'sales'), sql`${vatJournals.periodYear} = ${year}`, sql`${vatJournals.periodMonth} = ${month}`));

    const [purchasesRow] = await db
      .select({ netAmount: sql<string>`COALESCE(SUM(${vatJournals.netAmount}::numeric), 0)`, vatAmount: sql<string>`COALESCE(SUM(${vatJournals.vatAmount}::numeric), 0)` })
      .from(vatJournals)
      .where(and(eq(vatJournals.tenantId, tenant.id), eq(vatJournals.type, 'purchases'), sql`${vatJournals.periodYear} = ${year}`, sql`${vatJournals.periodMonth} = ${month}`));

    const salesNet = parseFloat(salesRow?.netAmount || '0');
    const salesVat = parseFloat(salesRow?.vatAmount || '0');
    const purchasesNet = parseFloat(purchasesRow?.netAmount || '0');
    const purchasesVat = parseFloat(purchasesRow?.vatAmount || '0');

    return { success: true, data: { period: { year, month }, salesNet, salesVat, purchasesNet, purchasesVat, vatPayable: Math.max(0, salesVat - purchasesVat), vatRefundable: Math.max(0, purchasesVat - salesVat) } };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}