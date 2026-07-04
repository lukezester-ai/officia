export type AppRole =
  | 'owner'
  | 'senior_accountant'
  | 'junior_accountant'
  | 'auditor'
  | 'tax_consultant';

const PERMISSIONS: Record<AppRole, string[]> = {
  owner: ['*'],
  senior_accountant: [
    'invoice:*',
    'journal:*',
    'vat:*',
    'employee:*',
    'bank:*',
    'report:*',
    'team:invite',
  ],
  junior_accountant: [
    'invoice:read',
    'invoice:create',
    'journal:read',
    'journal:create',
    'vat:read',
    'employee:read',
    'bank:read',
    'report:read',
  ],
  auditor: ['*:read', 'vat:export'],
  tax_consultant: ['invoice:read', 'vat:*', 'report:*'],
};

function matchesPermission(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  const [gResource, gAction] = granted.split(':');
  const [rResource, rAction] = required.split(':');
  if (gResource === rResource && gAction === '*') return true;
  if (gResource === '*' && gAction === rAction) return true;
  return false;
}

export function roleCan(role: AppRole, permission: string): boolean {
  return PERMISSIONS[role].some((p) => matchesPermission(p, permission));
}

export const INVITABLE_ROLES: AppRole[] = [
  'senior_accountant',
  'junior_accountant',
  'auditor',
  'tax_consultant',
];
