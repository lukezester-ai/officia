// @ts-nocheck
/**
 * Калкулатор за работни заплати (България)
 * Осигурителни вноски за 2024/2025 - Трета категория труд (родени след 1959 г.)
 *
 * Служител: ДОО 7.9% + ДЗПО 2.8% + ЗО 2.2% = 12.9%
 * Работодател: ДОО 10.92% + ДЗПО 4% + ЗО 4% = 18.92%
 * ДДФЛ: 10% върху (бруто - осигуровки на служителя)
 */

export interface PayrollBreakdown {
  // Входни данни
  grossSalary: number;
  month: string;
  year: number;

  // Осигуровки - служител
  employee: {
    doo: number;       // ДОО 7.9%
    dzpo: number;      // ДЗПО 2.8%
    zo: number;        // ЗО 2.2%
    total: number;     // 12.9% общо
  };

  // ДДФЛ
  taxBase: number;     // Бруто - осигуровки служител
  ddfl: number;        // 10% от данъчната основа

  // Нетна заплата
  netSalary: number;   // Бруто - осигуровки служител - ДДФЛ

  // Осигуровки - работодател
  employer: {
    doo: number;       // ДОО 10.92%
    dzpo: number;      // ДЗПО 4%
    zo: number;        // ЗО 4%
    total: number;     // 18.92% общо
  };

  // Общ разход за работодателя
  totalEmployerCost: number; // Бруто + осигуровки работодател

  // Максимален осигурителен доход (таван)
  maxInsuranceBase: number;
  insuranceBase: number; // действителна осигурителна основа (ограничена до тавана)
}

// Осигурителни ставки 2024/2025
const RATES = {
  // Служител
  EMPLOYEE_DOO: 7.9,
  EMPLOYEE_DZPO: 2.8,
  EMPLOYEE_ZO: 2.2,

  // Работодател
  EMPLOYER_DOO: 10.92,
  EMPLOYER_DZPO: 4.0,
  EMPLOYER_ZO: 4.0,

  // ДДФЛ
  DDFL: 10.0,

  // Максимален осигурителен доход (BGN/месец за 2024)
  MAX_INSURANCE_BASE: 3750,
} as const;

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
  const maxInsuranceBase = RATES.MAX_INSURANCE_BASE;

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
  const employeeDoo = round2(insuranceBase * RATES.EMPLOYEE_DOO / 100);
  const employeeDzpo = round2(insuranceBase * RATES.EMPLOYEE_DZPO / 100);
  const employeeZo = round2(insuranceBase * RATES.EMPLOYEE_ZO / 100);
  const employeeTotal = round2(employeeDoo + employeeDzpo + employeeZo);

  // --- ДДФЛ ---
  const taxBase = round2(Math.max(0, effectiveGross - employeeTotal));
  const ddfl = round2(taxBase * RATES.DDFL / 100);

  // --- Нетна заплата ---
  const netSalary = round2(effectiveGross - employeeTotal - ddfl);

  // --- Осигуровки РАБОТОДАТЕЛ ---
  const employerDoo = round2(insuranceBase * RATES.EMPLOYER_DOO / 100);
  const employerDzpo = round2(insuranceBase * RATES.EMPLOYER_DZPO / 100);
  const employerZo = round2(insuranceBase * RATES.EMPLOYER_ZO / 100);
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
