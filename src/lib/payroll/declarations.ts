/**
 * Чернова за декларация образец № 1 и образец № 6.
 * Сумите са за трудов договор, трета категория, родени след 1959 г. (2026).
 * ТЗПБ не влиза: ставката зависи от дейността на фирмата.
 * Файлът не е официалният EMPL формат и не се подава към НАП.
 */

import { PAYROLL_RATES, insuranceCeilingEur } from './rates';

export { insuranceCeilingEur };

export const DECLARATION_RATES = {
  employeeDoo: PAYROLL_RATES.employeeDoo / 100,
  employeeDzpo: PAYROLL_RATES.employeeDzpo / 100,
  employeeZo: PAYROLL_RATES.employeeZo / 100,
  employerDoo: PAYROLL_RATES.employerDoo / 100,
  employerDzpo: PAYROLL_RATES.employerDzpo / 100,
  employerZo: PAYROLL_RATES.employerZo / 100,
  incomeTax: PAYROLL_RATES.incomeTax / 100,
} as const;

const EGN_WEIGHTS = [2, 4, 8, 5, 10, 9, 7, 3, 6];
const EIK_WEIGHTS = [1, 2, 3, 4, 5, 6, 7, 8];
const EIK_WEIGHTS_ALT = [3, 4, 5, 6, 7, 8, 9, 10];

export type DeclarationEmployee = {
  firstName: string;
  lastName: string;
  egn?: string | null;
  grossSalary: number;
};

export type DeclarationPerson = {
  egn: string;
  firstName: string;
  lastName: string;
  insuredDays: number;
  insuranceBase: string;
  employeeDoo: string;
  employeeDzpo: string;
  employeeZo: string;
  employerDoo: string;
  employerDzpo: string;
  employerZo: string;
  incomeTax: string;
};

export type DeclarationDraft = {
  year: number;
  month: number;
  dueDate: string;
  eik: string;
  eikValid: boolean;
  ceiling: string;
  insuredDays: number;
  persons: DeclarationPerson[];
  missingIdentity: Array<{ firstName: string; lastName: string }>;
  summary: {
    insuranceBase: string;
    employeeDoo: string;
    employeeDzpo: string;
    employeeZo: string;
    employerDoo: string;
    employerDzpo: string;
    employerZo: string;
    incomeTax: string;
    contributionsDue: string;
  };
};

export function previousDeclarationPeriod(today: Date): { year: number; month: number } {
  const monthIndex = today.getMonth();
  if (monthIndex === 0) return { year: today.getFullYear() - 1, month: 12 };
  return { year: today.getFullYear(), month: monthIndex };
}

export function declarationDueDate(year: number, month: number): string {
  const due = new Date(year, month, 25);
  const y = due.getFullYear();
  const m = String(due.getMonth() + 1).padStart(2, '0');
  const d = String(due.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekdaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function isValidEgn(value: string | null | undefined): boolean {
  const pin = (value ?? '').trim();
  if (!/^\d{10}$/.test(pin)) return false;
  const sum = EGN_WEIGHTS.reduce((total, weight, index) => total + Number(pin[index]) * weight, 0);
  const remainder = sum % 11;
  const check = remainder === 10 ? 0 : remainder;
  return check === Number(pin[9]);
}

export function isValidEik(value: string | null | undefined): boolean {
  const eik = (value ?? '').replace(/^BG/i, '').trim();
  if (!/^\d{9}$/.test(eik)) return false;
  const digits = eik.split('').map(Number);
  const first = EIK_WEIGHTS.reduce((total, weight, index) => total + digits[index] * weight, 0) % 11;
  const check = first < 10
    ? first
    : EIK_WEIGHTS_ALT.reduce((total, weight, index) => total + digits[index] * weight, 0) % 11;
  return (check === 10 ? 0 : check) === digits[8];
}

function money(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function add(left: number, right: string): number {
  return Math.round((left + Number(right)) * 100) / 100;
}

export function buildPayrollDeclaration(input: {
  year: number;
  month: number;
  eik: string;
  employees: DeclarationEmployee[];
}): DeclarationDraft {
  const ceiling = insuranceCeilingEur(input.year, input.month);
  const insuredDays = weekdaysInMonth(input.year, input.month);
  const eik = input.eik.replace(/^BG/i, '').trim();
  const persons: DeclarationPerson[] = [];
  const missingIdentity: Array<{ firstName: string; lastName: string }> = [];

  for (const employee of input.employees) {
    const firstName = employee.firstName.trim();
    const lastName = employee.lastName.trim();
    if (!isValidEgn(employee.egn)) {
      missingIdentity.push({ firstName, lastName });
      continue;
    }
    const gross = Math.max(0, employee.grossSalary);
    const base = Math.min(gross, ceiling);
    const employeeDoo = base * DECLARATION_RATES.employeeDoo;
    const employeeDzpo = base * DECLARATION_RATES.employeeDzpo;
    const employeeZo = base * DECLARATION_RATES.employeeZo;
    const taxBase = Math.max(0, gross - employeeDoo - employeeDzpo - employeeZo);
    persons.push({
      egn: (employee.egn ?? '').trim(),
      firstName,
      lastName,
      insuredDays,
      insuranceBase: money(base),
      employeeDoo: money(employeeDoo),
      employeeDzpo: money(employeeDzpo),
      employeeZo: money(employeeZo),
      employerDoo: money(base * DECLARATION_RATES.employerDoo),
      employerDzpo: money(base * DECLARATION_RATES.employerDzpo),
      employerZo: money(base * DECLARATION_RATES.employerZo),
      incomeTax: money(taxBase * DECLARATION_RATES.incomeTax),
    });
  }

  const summary = persons.reduce(
    (total, person) => ({
      insuranceBase: add(total.insuranceBase, person.insuranceBase),
      employeeDoo: add(total.employeeDoo, person.employeeDoo),
      employeeDzpo: add(total.employeeDzpo, person.employeeDzpo),
      employeeZo: add(total.employeeZo, person.employeeZo),
      employerDoo: add(total.employerDoo, person.employerDoo),
      employerDzpo: add(total.employerDzpo, person.employerDzpo),
      employerZo: add(total.employerZo, person.employerZo),
      incomeTax: add(total.incomeTax, person.incomeTax),
    }),
    {
      insuranceBase: 0,
      employeeDoo: 0,
      employeeDzpo: 0,
      employeeZo: 0,
      employerDoo: 0,
      employerDzpo: 0,
      employerZo: 0,
      incomeTax: 0,
    },
  );

  const contributionsDue =
    summary.employeeDoo +
    summary.employeeDzpo +
    summary.employeeZo +
    summary.employerDoo +
    summary.employerDzpo +
    summary.employerZo;

  return {
    year: input.year,
    month: input.month,
    dueDate: declarationDueDate(input.year, input.month),
    eik,
    eikValid: isValidEik(eik),
    ceiling: money(ceiling),
    insuredDays,
    persons,
    missingIdentity,
    summary: {
      insuranceBase: money(summary.insuranceBase),
      employeeDoo: money(summary.employeeDoo),
      employeeDzpo: money(summary.employeeDzpo),
      employeeZo: money(summary.employeeZo),
      employerDoo: money(summary.employerDoo),
      employerDzpo: money(summary.employerDzpo),
      employerZo: money(summary.employerZo),
      incomeTax: money(summary.incomeTax),
      contributionsDue: money(contributionsDue),
    },
  };
}

function xmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderPayrollDeclarationXml(draft: DeclarationDraft): string {
  const persons = draft.persons.map((person, index) => `    <Person row="${index + 1}">
      <EGN>${xmlText(person.egn)}</EGN>
      <FirstName>${xmlText(person.firstName)}</FirstName>
      <LastName>${xmlText(person.lastName)}</LastName>
      <InsuredDays>${person.insuredDays}</InsuredDays>
      <InsuranceBase>${person.insuranceBase}</InsuranceBase>
      <EmployeeDOO>${person.employeeDoo}</EmployeeDOO>
      <EmployeeDZPO>${person.employeeDzpo}</EmployeeDZPO>
      <EmployeeZO>${person.employeeZo}</EmployeeZO>
      <EmployerDOO>${person.employerDoo}</EmployerDOO>
      <EmployerDZPO>${person.employerDzpo}</EmployerDZPO>
      <EmployerZO>${person.employerZo}</EmployerZO>
      <IncomeTax>${person.incomeTax}</IncomeTax>
    </Person>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficiaPayrollDraft kind="obr1-obr6" year="${draft.year}" month="${String(draft.month).padStart(2, '0')}" eik="${xmlText(draft.eik)}">
  <Notice>Чернова от ведомостта за преглед. Не е официалният файл на НАП и не се подава от Officia.</Notice>
  <Assumptions>Трудов договор, трета категория, родени след 1959 г. ТЗПБ не е включена. Осигурените дни са делниците в месеца, без официални празници.</Assumptions>
  <DueDate>${draft.dueDate}</DueDate>
  <Ceiling>${draft.ceiling}</Ceiling>
  <Declaration1>
${persons}
  </Declaration1>
  <Declaration6>
    <InsuranceBase>${draft.summary.insuranceBase}</InsuranceBase>
    <EmployeeDOO>${draft.summary.employeeDoo}</EmployeeDOO>
    <EmployeeDZPO>${draft.summary.employeeDzpo}</EmployeeDZPO>
    <EmployeeZO>${draft.summary.employeeZo}</EmployeeZO>
    <EmployerDOO>${draft.summary.employerDoo}</EmployerDOO>
    <EmployerDZPO>${draft.summary.employerDzpo}</EmployerDZPO>
    <EmployerZO>${draft.summary.employerZo}</EmployerZO>
    <IncomeTax>${draft.summary.incomeTax}</IncomeTax>
    <ContributionsDue>${draft.summary.contributionsDue}</ContributionsDue>
  </Declaration6>
</OfficiaPayrollDraft>
`;
}
