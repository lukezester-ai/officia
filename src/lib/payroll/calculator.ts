/**
 * Калкулатор за работни заплати (България, 2026).
 * Трета категория труд, родени след 1959 г. ТЗПБ не влиза.
 */
import { PAYROLL_RATES, insuranceCeilingEur, payrollMonthNumber } from './rates';

export interface PayrollBreakdown {
  // Входни данни
  grossSalary: number;
  month: string;
  year: number;

  // Осигуровки - служител
  employee: {
    doo: number;
    dzpo: number;
    zo: number;
    total: number;
  };

  // ДДФЛ
  taxBase: number;     // Бруто - осигуровки служител
  ddfl: number;        // 10% от данъчната основа

  // Нетна заплата
  netSalary: number;   // Бруто - осигуровки служител - ДДФЛ

  // Осигуровки - работодател
  employer: {
    doo: number;
    dzpo: number;
    zo: number;
    total: number;
  };

  // Общ разход за работодателя
  totalEmployerCost: number; // Бруто + осигуровки работодател

  // Максимален осигурителен доход (таван)
  maxInsuranceBase: number;
  insuranceBase: number; // действителна осигурителна основа (ограничена до тавана)
  adjustments?: PayrollAdjustments;
  effectiveGross?: number;
  sickLeaveCompEmployer?: number;
}

export interface PayrollAdjustments {
  workingDays?: number;       // Общо работни дни в месеца (по подразбиране 21)
  workedDays?: number;        // Отработени дни
  paidLeaveDays?: number;     // Платен годишен отпуск (ПГО)
  sickDaysEmployer?: number;  // Болнични (първи 3 дни от работодателя на 70%)
  sickDaysNOI?: number;       // Болнични от НОИ (над 3-ти ден)
  unpaidLeaveDays?: number;   // Неплатен отпуск
}

/**
 * Изчислява пълен разчет на работна заплата по българското законодателство,
 * включително корекции за отпуски и болнични (Връзка ЧР ↔ ТРЗ).
 */
export function calculatePayroll(
  grossSalary: number,
  month: string,
  year: number,
  adjustments?: PayrollAdjustments
): PayrollBreakdown & { adjustments?: PayrollAdjustments; effectiveGross: number; sickLeaveCompEmployer: number } {
  const baseGross = Math.max(0, grossSalary);
  const maxInsuranceBase = insuranceCeilingEur(year, payrollMonthNumber(month));

  let effectiveGross = baseGross;
  let sickLeaveCompEmployer = 0;

  if (adjustments && adjustments.workingDays && adjustments.workingDays > 0) {
    const wd = adjustments.workingDays;
    const worked = adjustments.workedDays !== undefined ? adjustments.workedDays : (wd - (adjustments.paidLeaveDays || 0) - (adjustments.sickDaysEmployer || 0) - (adjustments.sickDaysNOI || 0) - (adjustments.unpaidLeaveDays || 0));
    const dailyRate = baseGross / wd;

    const baseWorkedPay = round2(worked * dailyRate);
    const paidLeavePay = round2((adjustments.paidLeaveDays || 0) * dailyRate);
    sickLeaveCompEmployer = round2((adjustments.sickDaysEmployer || 0) * dailyRate * 0.70);

    effectiveGross = round2(baseWorkedPay + paidLeavePay + sickLeaveCompEmployer);
  }

  // Осигурителна основа (ограничена до тавана)
  const insuranceBase = Math.min(effectiveGross, maxInsuranceBase);

  // --- Осигуровки СЛУЖИТЕЛ ---
  const employeeDoo = round2(insuranceBase * PAYROLL_RATES.employeeDoo / 100);
  const employeeDzpo = round2(insuranceBase * PAYROLL_RATES.employeeDzpo / 100);
  const employeeZo = round2(insuranceBase * PAYROLL_RATES.employeeZo / 100);
  const employeeTotal = round2(employeeDoo + employeeDzpo + employeeZo);

  // --- ДДФЛ ---
  const taxBase = round2(Math.max(0, effectiveGross - employeeTotal));
  const ddfl = round2(taxBase * PAYROLL_RATES.incomeTax / 100);

  // --- Нетна заплата ---
  const netSalary = round2(effectiveGross - employeeTotal - ddfl);

  // --- Осигуровки РАБОТОДАТЕЛ ---
  const employerDoo = round2(insuranceBase * PAYROLL_RATES.employerDoo / 100);
  const employerDzpo = round2(insuranceBase * PAYROLL_RATES.employerDzpo / 100);
  const employerZo = round2(insuranceBase * PAYROLL_RATES.employerZo / 100);
  const employerTotal = round2(employerDoo + employerDzpo + employerZo);

  // --- Общ разход за работодателя ---
  const totalEmployerCost = round2(effectiveGross + employerTotal);

  return {
    grossSalary: baseGross,
    effectiveGross,
    sickLeaveCompEmployer,
    month,
    year,
    adjustments,
    employee: {
      doo: employeeDoo,
      dzpo: employeeDzpo,
      zo: employeeZo,
      total: employeeTotal,
    },
    taxBase,
    ddfl,
    netSalary,
    employer: {
      doo: employerDoo,
      dzpo: employerDzpo,
      zo: employerZo,
      total: employerTotal,
    },
    totalEmployerCost,
    maxInsuranceBase,
    insuranceBase,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
