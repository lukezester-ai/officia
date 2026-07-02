export const PAYROLL_2026_DEFAULTS = {
  maxInsuranceBase: 2111.64,
  minimumMonthlyWage: 620.2,
  employeeInsuranceRate: 13.78,
  employerInsuranceRate: 19.12,
  incomeTaxRate: 10,
} as const;

export type PayrollRates = {
  maxInsuranceBase: number;
  employeeInsuranceRate: number;
  employerInsuranceRate: number;
  incomeTaxRate: number;
};

export type PayrollInput = {
  employeeId: string;
  employeeName: string;
  position: string | null;
  baseSalary: number;
  workingDays: number;
  workedDays: number;
  bonus: number;
  otherTaxable: number;
  otherDeductions: number;
};

export type PayrollCalculation = PayrollInput & {
  gross: number;
  insuranceBase: number;
  employeeInsurance: number;
  employerInsurance: number;
  incomeTax: number;
  net: number;
  employerCost: number;
  hasWarning: boolean;
  warning: string | null;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function workingDaysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function calculatePayrollRow(input: PayrollInput, rates: PayrollRates): PayrollCalculation {
  const workingDays = Math.max(1, Math.round(input.workingDays));
  const workedDays = Math.min(workingDays, Math.max(0, Math.round(input.workedDays)));
  const baseSalary = Math.max(0, input.baseSalary || 0);
  const bonus = Math.max(0, input.bonus || 0);
  const otherTaxable = Math.max(0, input.otherTaxable || 0);
  const otherDeductions = Math.max(0, input.otherDeductions || 0);
  const gross = money((baseSalary * workedDays) / workingDays + bonus + otherTaxable);
  const insuranceBase = money(Math.min(gross, Math.max(0, rates.maxInsuranceBase)));
  const employeeInsurance = money(insuranceBase * rates.employeeInsuranceRate / 100);
  const employerInsurance = money(insuranceBase * rates.employerInsuranceRate / 100);
  const taxableBase = Math.max(0, gross - employeeInsurance);
  const incomeTax = money(taxableBase * rates.incomeTaxRate / 100);
  const net = money(Math.max(0, gross - employeeInsurance - incomeTax - otherDeductions));
  const employerCost = money(gross + employerInsurance);
  const warning = baseSalary > 0 && baseSalary < PAYROLL_2026_DEFAULTS.minimumMonthlyWage
    ? `Основната заплата е под минималната за 2026 г. (${PAYROLL_2026_DEFAULTS.minimumMonthlyWage.toFixed(2)} €).`
    : null;

  return {
    ...input,
    baseSalary,
    workingDays,
    workedDays,
    bonus,
    otherTaxable,
    otherDeductions,
    gross,
    insuranceBase,
    employeeInsurance,
    employerInsurance,
    incomeTax,
    net,
    employerCost,
    hasWarning: Boolean(warning),
    warning,
  };
}

export function payrollTotals(rows: PayrollCalculation[]) {
  const sum = (pick: (row: PayrollCalculation) => number) => money(rows.reduce((total, row) => total + pick(row), 0));
  return {
    gross: sum((row) => row.gross),
    employeeInsurance: sum((row) => row.employeeInsurance),
    employerInsurance: sum((row) => row.employerInsurance),
    tax: sum((row) => row.incomeTax),
    net: sum((row) => row.net),
    employerCost: sum((row) => row.employerCost),
    otherDeductions: sum((row) => row.otherDeductions),
  };
}
