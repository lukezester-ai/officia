import {
  buildPayrollDeclaration,
  declarationDueDate,
  insuranceCeilingEur,
  isValidEgn,
  isValidEik,
  previousDeclarationPeriod,
  renderPayrollDeclarationXml,
  weekdaysInMonth,
} from '@/lib/payroll/declarations';

function withEgnChecksum(firstNine: string): string {
  const weights = [2, 4, 8, 5, 10, 9, 7, 3, 6];
  const sum = firstNine.split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return firstNine + String(remainder === 10 ? 0 : remainder);
}

function withEikChecksum(firstEight: string): string {
  const primary = [1, 2, 3, 4, 5, 6, 7, 8];
  const alternate = [3, 4, 5, 6, 7, 8, 9, 10];
  const digits = firstEight.split('').map(Number);
  const first = primary.reduce((total, weight, index) => total + digits[index] * weight, 0) % 11;
  if (first < 10) return firstEight + String(first);
  const second = alternate.reduce((total, weight, index) => total + digits[index] * weight, 0) % 11;
  return firstEight + String(second === 10 ? 0 : second);
}

describe('payroll declarations', () => {
  const egn = withEgnChecksum('750101001');
  const eik = withEikChecksum('17507475');

  it('checks identity numbers and the following-month deadline', () => {
    expect(isValidEgn(egn)).toBe(true);
    expect(isValidEgn(`${egn.slice(0, 9)}${(Number(egn[9]) + 1) % 10}`)).toBe(false);
    expect(isValidEik(eik)).toBe(true);
    expect(isValidEik('175074750')).toBe(false);
    expect(previousDeclarationPeriod(new Date(2026, 8, 26))).toEqual({ year: 2026, month: 8 });
    expect(declarationDueDate(2026, 12)).toBe('2027-01-25');
    expect(insuranceCeilingEur(2026, 7)).toBe(2111.64);
    expect(insuranceCeilingEur(2026, 8)).toBe(2300);
    expect(weekdaysInMonth(2026, 8)).toBe(21);
  });

  it('sums declaration 1 into declaration 6 and skips a missing EGN', () => {
    const draft = buildPayrollDeclaration({
      year: 2026,
      month: 8,
      eik,
      employees: [
        { firstName: 'Иван', lastName: 'Петров', egn, grossSalary: 1000 },
        { firstName: 'Мария', lastName: 'Иванова', egn: '', grossSalary: 800 },
      ],
    });

    expect(draft.eikValid).toBe(true);
    expect(draft.persons).toHaveLength(1);
    expect(draft.missingIdentity).toEqual([{ firstName: 'Мария', lastName: 'Иванова' }]);
    expect(draft.persons[0]).toMatchObject({
      insuranceBase: '1000.00',
      employeeDoo: '83.80',
      employeeDzpo: '22.00',
      employeeZo: '32.00',
      employerDoo: '109.20',
      employerDzpo: '28.00',
      employerZo: '48.00',
      incomeTax: '86.22',
      insuredDays: 21,
    });
    expect(draft.summary.contributionsDue).toBe('323.00');
    expect(draft.summary.incomeTax).toBe('86.22');

    const xml = renderPayrollDeclarationXml(draft);
    expect(xml).toContain('<Notice>');
    expect(xml).toContain(egn);
    expect(xml).toContain('<ContributionsDue>323.00</ContributionsDue>');
    expect(xml).not.toContain('Мария');
  });
});
