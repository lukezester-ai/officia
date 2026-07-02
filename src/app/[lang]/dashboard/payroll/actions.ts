'use server';

import { db } from '@/lib/db/db';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { employees } from '@/lib/db/schema/employees';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { payrollBatches, payrollItems } from '@/lib/db/schema/payroll';
import { contributionRates } from '@/lib/db/schema/contribution_rates';
import { auditLog } from '@/lib/db/schema/audit_log';
import { and, asc, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { requirePermission } from '@/lib/auth/rbac';
import {
  calculatePayrollRow,
  payrollTotals,
  PAYROLL_2026_DEFAULTS,
  workingDaysInMonth,
  type PayrollInput,
  type PayrollRates,
} from '@/lib/payroll/calculator';

const validMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const monthDate = (month: string) => `${month}-01`;
const number = (value: unknown) => Number(value) || 0;
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

async function getContributionRate(tenantId: string, month: string) {
  const date = monthDate(month);
  const rows = await db.select().from(contributionRates).where(and(
    or(eq(contributionRates.tenantId, tenantId), isNull(contributionRates.tenantId)),
    lte(contributionRates.validFrom, date),
    or(isNull(contributionRates.validTo), gte(contributionRates.validTo, date)),
  ));
  return rows.find((row) => row.tenantId === tenantId) ?? rows.find((row) => row.tenantId === null) ?? null;
}

function splitRates(rates: PayrollRates) {
  return {
    employeeDooRate: number(rates.employeeDooRate ?? PAYROLL_2026_DEFAULTS.employeeDooRate),
    employeeHealthRate: number(rates.employeeHealthRate ?? PAYROLL_2026_DEFAULTS.employeeHealthRate),
    employerDooRate: number(rates.employerDooRate ?? PAYROLL_2026_DEFAULTS.employerDooRate),
    employerHealthRate: number(rates.employerHealthRate ?? PAYROLL_2026_DEFAULTS.employerHealthRate),
    employerOtherRate: number(rates.employerOtherRate ?? PAYROLL_2026_DEFAULTS.employerOtherRate),
  };
}

export type PayrollDraftPayload = {
  month: string;
  rates: PayrollRates;
  rows: PayrollInput[];
};

function serializeBatch(batch: typeof payrollBatches.$inferSelect, rows: Array<typeof payrollItems.$inferSelect>) {
  const metadata = (batch.calculationMetadata ?? {}) as Record<string, unknown>;
  return {
    batchId: batch.id,
    month: batch.month.slice(0, 7),
    status: batch.status,
    journalHeaderId: batch.journalHeaderId,
    rates: {
      maxInsuranceBase: number(batch.maxInsuranceBase),
      minimumMonthlyWage: number(metadata.minimumMonthlyWage ?? PAYROLL_2026_DEFAULTS.minimumMonthlyWage),
      minimumInsuranceIncome: number(metadata.minimumInsuranceIncome ?? PAYROLL_2026_DEFAULTS.minimumInsuranceIncome),
      employeeInsuranceRate: number(batch.employeeInsuranceRate),
      employerInsuranceRate: number(batch.employerInsuranceRate),
      incomeTaxRate: number(batch.incomeTaxRate),
      employeeDooRate: number(metadata.employeeDooRate ?? PAYROLL_2026_DEFAULTS.employeeDooRate),
      employeeHealthRate: number(metadata.employeeHealthRate ?? PAYROLL_2026_DEFAULTS.employeeHealthRate),
      employerDooRate: number(metadata.employerDooRate ?? PAYROLL_2026_DEFAULTS.employerDooRate),
      employerHealthRate: number(metadata.employerHealthRate ?? PAYROLL_2026_DEFAULTS.employerHealthRate),
      employerOtherRate: number(metadata.employerOtherRate ?? PAYROLL_2026_DEFAULTS.employerOtherRate),
    },
    list: rows.map((row) => ({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      position: row.position,
      baseSalary: number(row.baseSalary),
      workingDays: row.workingDays,
      workedDays: row.workedDays,
      bonus: number(row.bonus),
      otherTaxable: number(row.otherTaxable),
      otherDeductions: number(row.otherDeductions),
      gross: number(row.gross),
      insuranceBase: number(row.insuranceBase),
      employeeInsurance: number(row.employeeInsurance),
      employerInsurance: number(row.employerInsurance),
      incomeTax: number(row.incomeTax),
      net: number(row.net),
      employerCost: number(row.employerCost),
      hasWarning: row.hasWarning,
      warning: row.warning,
    })),
    totals: {
      gross: number(batch.totalGross),
      employeeInsurance: number(batch.totalEmployeeInsurance),
      employerInsurance: number(batch.totalEmployerInsurance),
      tax: number(batch.totalTax),
      net: number(batch.totalNet),
      employerCost: number(batch.totalEmployerCost),
      otherDeductions: rows.reduce((sum, row) => sum + number(row.otherDeductions), 0),
    },
  };
}

export async function getPayrollData(requestedMonth?: string) {
  try {
    const { tenantId } = await requireTenant();
    const month = validMonth(requestedMonth ?? '') ? requestedMonth! : new Date().toISOString().slice(0, 7);
    const [batch] = await db.select().from(payrollBatches)
      .where(and(eq(payrollBatches.tenantId, tenantId), eq(payrollBatches.month, monthDate(month))));

    const history = await db.select({ id: payrollBatches.id, month: payrollBatches.month, status: payrollBatches.status })
      .from(payrollBatches)
      .where(eq(payrollBatches.tenantId, tenantId))
      .orderBy(desc(payrollBatches.month))
      .limit(24);

    if (batch) {
      const rows = await db.select().from(payrollItems)
        .where(and(eq(payrollItems.tenantId, tenantId), eq(payrollItems.batchId, batch.id)))
        .orderBy(asc(payrollItems.employeeName));
      return { success: true as const, data: { ...serializeBatch(batch, rows), history } };
    }

    const activeEmployees = await db.select().from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)))
      .orderBy(asc(employees.firstName), asc(employees.lastName));
    const days = workingDaysInMonth(month);
    const statutoryRate = await getContributionRate(tenantId, month);
    const rates: PayrollRates = statutoryRate ? {
      maxInsuranceBase: number(statutoryRate.maxInsuranceBase),
      minimumMonthlyWage: number(statutoryRate.minimumWage ?? PAYROLL_2026_DEFAULTS.minimumMonthlyWage),
      minimumInsuranceIncome: number(statutoryRate.minimumInsuranceIncome ?? statutoryRate.minimumWage ?? PAYROLL_2026_DEFAULTS.minimumInsuranceIncome),
      employeeInsuranceRate: number(statutoryRate.employeeDooRate) + number(statutoryRate.employeeHealthRate) + number(statutoryRate.employeeOtherRate),
      employerInsuranceRate: number(statutoryRate.employerDooRate) + number(statutoryRate.employerHealthRate) + number(statutoryRate.employerOtherRate),
      incomeTaxRate: number(statutoryRate.incomeTaxRate),
      employeeDooRate: number(statutoryRate.employeeDooRate),
      employeeHealthRate: number(statutoryRate.employeeHealthRate),
      employerDooRate: number(statutoryRate.employerDooRate),
      employerHealthRate: number(statutoryRate.employerHealthRate),
      employerOtherRate: number(statutoryRate.employerOtherRate),
    } : { ...PAYROLL_2026_DEFAULTS };
    const list = activeEmployees.map((employee) => calculatePayrollRow({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      position: employee.position,
      baseSalary: number(employee.salary),
      birthYear: employee.birthYear,
      minimumInsuranceIncome: number(employee.minimumInsuranceIncome ?? rates.minimumInsuranceIncome ?? PAYROLL_2026_DEFAULTS.minimumInsuranceIncome),
      economicActivityCode: employee.economicActivityCode,
      insuranceCategory: employee.insuranceCategory,
      workingDays: days,
      workedDays: days,
      bonus: 0,
      otherTaxable: 0,
      otherDeductions: 0,
    }, rates));

    return {
      success: true as const,
      data: { batchId: null, month, status: 'new' as const, journalHeaderId: null, rates, list, totals: payrollTotals(list), history },
    };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при зареждане на ведомостта' };
  }
}

export async function savePayrollDraft(payload: PayrollDraftPayload) {
  try {
    const { tenantId, user } = await requireTenant();
    const permission = await requirePermission(tenantId, user.id, 'employee:*');
    if (!permission.ok) return { success: false as const, error: permission.error };
    if (!validMonth(payload.month)) return { success: false as const, error: 'Невалиден месец.' };
    if (!payload.rows.length) return { success: false as const, error: 'Няма служители във ведомостта.' };

    const employeeRows = await db.select().from(employees).where(eq(employees.tenantId, tenantId));
    const employeeMap = new Map(employeeRows.map((employee) => [employee.id, employee]));
    const rates: PayrollRates = {
      maxInsuranceBase: Math.max(0, number(payload.rates.maxInsuranceBase)),
      minimumMonthlyWage: Math.max(0, number(payload.rates.minimumMonthlyWage ?? PAYROLL_2026_DEFAULTS.minimumMonthlyWage)),
      minimumInsuranceIncome: Math.max(0, number(payload.rates.minimumInsuranceIncome ?? PAYROLL_2026_DEFAULTS.minimumInsuranceIncome)),
      employeeInsuranceRate: Math.max(0, number(payload.rates.employeeInsuranceRate)),
      employerInsuranceRate: Math.max(0, number(payload.rates.employerInsuranceRate)),
      incomeTaxRate: Math.max(0, number(payload.rates.incomeTaxRate)),
      ...splitRates(payload.rates),
    };
    const calculated = payload.rows.map((row) => {
      const employee = employeeMap.get(row.employeeId);
      if (!employee) throw new Error(`Служителят ${row.employeeName} не принадлежи към фирмата.`);
      return calculatePayrollRow({
        ...row,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        position: employee.position,
        birthYear: employee.birthYear,
        minimumInsuranceIncome: number(employee.minimumInsuranceIncome ?? row.minimumInsuranceIncome ?? rates.minimumInsuranceIncome ?? PAYROLL_2026_DEFAULTS.minimumInsuranceIncome),
        economicActivityCode: employee.economicActivityCode,
        insuranceCategory: employee.insuranceCategory,
      }, rates);
    });
    const totals = payrollTotals(calculated);
    const statutoryRate = await getContributionRate(tenantId, payload.month);
    const detailedRates = splitRates(rates);

    const saved = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(payrollBatches)
        .where(and(eq(payrollBatches.tenantId, tenantId), eq(payrollBatches.month, monthDate(payload.month))));
      if (existing && ['approved', 'posted', 'paid', 'submitted', 'canceled'].includes(existing.status)) {
        throw new Error('Заключена ведомост не може да бъде променяна.');
      }

      const batchValues = {
        tenantId,
        month: monthDate(payload.month),
        status: 'draft' as const,
        maxInsuranceBase: rates.maxInsuranceBase.toFixed(2),
        employeeInsuranceRate: rates.employeeInsuranceRate.toFixed(3),
        employerInsuranceRate: rates.employerInsuranceRate.toFixed(3),
        incomeTaxRate: rates.incomeTaxRate.toFixed(3),
        totalGross: totals.gross.toFixed(2),
        totalEmployeeInsurance: totals.employeeInsurance.toFixed(2),
        totalEmployerInsurance: totals.employerInsurance.toFixed(2),
        totalTax: totals.tax.toFixed(2),
        totalNet: totals.net.toFixed(2),
        totalEmployerCost: totals.employerCost.toFixed(2),
        createdBy: user.id,
        contributionRateId: statutoryRate?.id ?? null,
        calculationMetadata: {
          ...detailedRates,
          minimumMonthlyWage: rates.minimumMonthlyWage,
          minimumInsuranceIncome: rates.minimumInsuranceIncome,
          source: statutoryRate?.sourceUrl ?? 'fallback',
          contributionRateName: statutoryRate?.name ?? 'Вградени стойности',
        },
        updatedAt: new Date(),
      };
      const [batch] = existing
        ? await tx.update(payrollBatches).set(batchValues).where(eq(payrollBatches.id, existing.id)).returning()
        : await tx.insert(payrollBatches).values(batchValues).returning();

      await tx.delete(payrollItems).where(eq(payrollItems.batchId, batch.id));
      await tx.insert(payrollItems).values(calculated.map((row) => {
        const employeeHealth = money(row.insuranceBase * detailedRates.employeeHealthRate / 100);
        const employerHealth = money(row.insuranceBase * detailedRates.employerHealthRate / 100);
        const employerOther = money(row.insuranceBase * detailedRates.employerOtherRate / 100);
        return {
        batchId: batch.id,
        tenantId,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        position: row.position,
        baseSalary: row.baseSalary.toFixed(2),
        workingDays: row.workingDays,
        workedDays: row.workedDays,
        bonus: row.bonus.toFixed(2),
        otherTaxable: row.otherTaxable.toFixed(2),
        otherDeductions: row.otherDeductions.toFixed(2),
        gross: row.gross.toFixed(2),
        insuranceBase: row.insuranceBase.toFixed(2),
        employeeInsurance: row.employeeInsurance.toFixed(2),
        employerInsurance: row.employerInsurance.toFixed(2),
        employeeDoo: money(row.employeeInsurance - employeeHealth).toFixed(2),
        employeeHealth: employeeHealth.toFixed(2),
        employerDoo: money(row.employerInsurance - employerHealth - employerOther).toFixed(2),
        employerHealth: employerHealth.toFixed(2),
        employerOther: employerOther.toFixed(2),
        incomeTax: row.incomeTax.toFixed(2),
        net: row.net.toFixed(2),
        employerCost: row.employerCost.toFixed(2),
        hasWarning: row.hasWarning,
        warning: row.warning,
        metadata: { rates: detailedRates },
      } }));

      for (const row of calculated) {
        await tx.update(employees).set({ salary: row.baseSalary.toFixed(2), updatedAt: new Date() })
          .where(and(eq(employees.id, row.employeeId), eq(employees.tenantId, tenantId)));
      }
      await tx.insert(auditLog).values({
        tenantId,
        userId: user.id,
        action: existing ? 'UPDATE' : 'CREATE',
        tableName: 'payroll_batches',
        recordId: batch.id,
        oldData: existing ? { status: existing.status, totalGross: existing.totalGross, totalNet: existing.totalNet } : null,
        newData: { status: batch.status, month: batch.month, totalGross: totals.gross, totalNet: totals.net, employees: calculated.length },
        metadata: { source: 'payroll_ui' },
      });
      return batch.id;
    });

    revalidatePath('/bg/dashboard/payroll');
    return { success: true as const, batchId: saved };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при записване' };
  }
}

export async function postPayroll(batchId: string) {
  try {
    const { tenantId, user } = await requireTenant();
    const permission = await requirePermission(tenantId, user.id, 'employee:*');
    if (!permission.ok) return { success: false as const, error: permission.error };

    const result = await db.transaction(async (tx) => {
      const [batch] = await tx.select().from(payrollBatches)
        .where(and(eq(payrollBatches.id, batchId), eq(payrollBatches.tenantId, tenantId)));
      if (!batch) throw new Error('Ведомостта не е намерена.');
      if (!['draft', 'calculated', 'approved'].includes(batch.status)) {
        throw new Error('Ведомостта не е в статус, който позволява осчетоводяване.');
      }
      const rows = await tx.select().from(payrollItems).where(eq(payrollItems.batchId, batch.id));
      if (!rows.length) throw new Error('Ведомостта няма редове.');

      const accountDefinitions = [
        ['604', 'Разходи за заплати', 'expense'],
        ['605', 'Разходи за осигуровки', 'expense'],
        ['421', 'Персонал', 'liability'],
        ['461', 'Разчети по осигуряване', 'liability'],
        ['454', 'Разчети за данък върху доходите', 'liability'],
        ['498', 'Други разчети с персонала', 'liability'],
      ] as const;
      const accounts = new Map<string, string>();
      for (const [accountNumber, name, type] of accountDefinitions) {
        let [account] = await tx.select().from(accountPlan)
          .where(and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, accountNumber)));
        if (!account) [account] = await tx.insert(accountPlan).values({ tenantId, accountNumber, name, type }).returning();
        accounts.set(accountNumber, account.id);
      }

      const month = batch.month.slice(0, 7);
      const [year, monthNumber] = month.split('-').map(Number);
      const accountingDate = new Date(Date.UTC(year, monthNumber, 0, 12));
      const journalNumber = `PAY-${tenantId.slice(0, 8)}-${month}`;
      const [header] = await tx.insert(journalHeaders).values({
        tenantId,
        journalNumber,
        entryDate: accountingDate,
        description: `Ведомост за заплати ${month}`,
        documentType: 'payroll',
        status: 'posted',
        postedBy: user.id,
        postedAt: new Date(),
      }).returning();

      const gross = number(batch.totalGross);
      const employeeInsurance = number(batch.totalEmployeeInsurance);
      const employerInsurance = number(batch.totalEmployerInsurance);
      const tax = number(batch.totalTax);
      const net = number(batch.totalNet);
      const otherDeductions = rows.reduce((sum, row) => sum + number(row.otherDeductions), 0);
      const entries = [
        ['604', 'debit', gross, 'Начислени брутни възнаграждения'],
        ['605', 'debit', employerInsurance, 'Осигуровки за сметка на работодателя'],
        ['421', 'credit', net, 'Нетни възнаграждения за изплащане'],
        ['461', 'credit', employeeInsurance + employerInsurance, 'Дължими осигурителни вноски'],
        ['454', 'credit', tax, 'Дължим данък върху доходите'],
        ['498', 'credit', otherDeductions, 'Други удръжки'],
      ] as const;
      await tx.insert(journalLines).values(entries.filter((entry) => entry[2] > 0).map(([account, entryType, amount, description]) => ({
        journalId: header.id,
        accountId: accounts.get(account)!,
        entryType,
        amount: amount.toFixed(2),
        description,
        currency: 'EUR',
      })));
      await tx.update(payrollBatches).set({
        status: 'posted', journalHeaderId: header.id, postedBy: user.id, postedAt: new Date(), updatedAt: new Date(),
      }).where(eq(payrollBatches.id, batch.id));
      await tx.insert(auditLog).values({
        tenantId,
        userId: user.id,
        action: 'POST',
        tableName: 'payroll_batches',
        recordId: batch.id,
        oldData: { status: batch.status },
        newData: { status: 'posted', journalHeaderId: header.id, journalNumber },
        metadata: { source: 'payroll_ui' },
      });
      return { journalNumber };
    });

    revalidatePath('/bg/dashboard/payroll');
    revalidatePath('/bg/dashboard/accounting/journal');
    return { success: true as const, ...result };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при осчетоводяване' };
  }
}
