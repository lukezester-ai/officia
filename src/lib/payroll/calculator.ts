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

/**
 * Изчислява пълен разчет на работна заплата по българското законодателство.
 *
 * @param grossSalary - Брутна работна заплата в BGN
 * @param month - Месец (напр. "Януари")
 * @param year - Година
 * @returns Пълен PayrollBreakdown обект
 */
export function calculatePayroll(
  grossSalary: number,
  month: string,
  year: number
): PayrollBreakdown {
  const gross = Math.max(0, grossSalary);
  const maxInsuranceBase = RATES.MAX_INSURANCE_BASE;

  // Осигурителна основа (ограничена до тавана)
  const insuranceBase = Math.min(gross, maxInsuranceBase);

  // --- Осигуровки СЛУЖИТЕЛ ---
  const employeeDoo = round2(insuranceBase * RATES.EMPLOYEE_DOO / 100);
  const employeeDzpo = round2(insuranceBase * RATES.EMPLOYEE_DZPO / 100);
  const employeeZo = round2(insuranceBase * RATES.EMPLOYEE_ZO / 100);
  const employeeTotal = round2(employeeDoo + employeeDzpo + employeeZo);

  // --- ДДФЛ ---
  const taxBase = round2(Math.max(0, gross - employeeTotal));
  const ddfl = round2(taxBase * RATES.DDFL / 100);

  // --- Нетна заплата ---
  const netSalary = round2(gross - employeeTotal - ddfl);

  // --- Осигуровки РАБОТОДАТЕЛ ---
  const employerDoo = round2(insuranceBase * RATES.EMPLOYER_DOO / 100);
  const employerDzpo = round2(insuranceBase * RATES.EMPLOYER_DZPO / 100);
  const employerZo = round2(insuranceBase * RATES.EMPLOYER_ZO / 100);
  const employerTotal = round2(employerDoo + employerDzpo + employerZo);

  // --- Общ разход за работодателя ---
  const totalEmployerCost = round2(gross + employerTotal);

  return {
    grossSalary: gross,
    month,
    year,
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
