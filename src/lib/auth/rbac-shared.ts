export type AppRole =
  | 'owner'
  | 'senior_accountant'
  | 'junior_accountant'
  | 'auditor'
  | 'tax_consultant';

export const INVITABLE_ROLES: AppRole[] = [
  'senior_accountant',
  'junior_accountant',
  'auditor',
  'tax_consultant',
];
