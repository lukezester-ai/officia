import { describe, expect, it } from 'vitest';
import { calculatePayrollRow, payrollTotals, PAYROLL_2026_DEFAULTS, workingDaysInMonth } from '@/lib/payroll/calculator';

describe('payroll calculator', () => {
  it('calculates a full month and caps the insurance base', () => {
    const row = calculatePayrollRow({
      employeeId: 'employee-1', employeeName: 'Иван Иванов', position: null,
      baseSalary: 3000, workingDays: 22, workedDays: 22, bonus: 0, otherTaxable: 0, otherDeductions: 0,
    }, PAYROLL_2026_DEFAULTS);

    expect(row.gross).toBe(3000);
    expect(row.insuranceBase).toBe(2111.64);
    expect(row.employeeInsurance).toBe(290.98);
    expect(row.incomeTax).toBe(270.9);
    expect(row.net).toBe(2438.12);
  });

  it('prorates salary and applies additions and deductions', () => {
    const row = calculatePayrollRow({
      employeeId: 'employee-2', employeeName: 'Мария Петрова', position: null,
      baseSalary: 1000, workingDays: 20, workedDays: 10, bonus: 100, otherTaxable: 50, otherDeductions: 25,
    }, PAYROLL_2026_DEFAULTS);

    expect(row.gross).toBe(650);
    expect(row.net).toBe(479.39);
    expect(payrollTotals([row]).employerCost).toBe(row.employerCost);
  });

  it('counts weekdays in a month', () => {
    expect(workingDaysInMonth('2026-07')).toBe(23);
  });
});
