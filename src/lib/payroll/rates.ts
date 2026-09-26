/** Ставки за 2026, трета категория труд, родени след 1959 г. ТЗПБ не влиза. */

export const PAYROLL_RATES = {
  employeeDoo: 8.38,
  employeeDzpo: 2.2,
  employeeZo: 3.2,
  employerDoo: 10.92,
  employerDzpo: 2.8,
  employerZo: 4.8,
  incomeTax: 10,
} as const;

export const EMPLOYEE_RATE_TOTAL =
  PAYROLL_RATES.employeeDoo + PAYROLL_RATES.employeeDzpo + PAYROLL_RATES.employeeZo;

export const EMPLOYER_RATE_TOTAL =
  PAYROLL_RATES.employerDoo + PAYROLL_RATES.employerDzpo + PAYROLL_RATES.employerZo;

const MONTHS = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
];

export function payrollMonthNumber(month: string): number {
  const numeric = Number(month);
  if (numeric >= 1 && numeric <= 12) return numeric;
  const index = MONTHS.findIndex((name) => month.trim().toLowerCase().startsWith(name.slice(0, 3)));
  return index >= 0 ? index + 1 : new Date().getMonth() + 1;
}

export function insuranceCeilingEur(year: number, month: number): number {
  if (year === 2026 && month < 8) return 2111.64;
  return 2300;
}

export function formatRate(percent: number): string {
  return `${percent.toFixed(2)}%`;
}
