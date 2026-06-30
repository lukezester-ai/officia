import 'server-only';

import { db } from '@/lib/db/db';
import { userRoles } from '@/lib/db/schema/access';
import { and, eq } from 'drizzle-orm';
import { type AppRole, INVITABLE_ROLES } from './rbac-shared';

export { type AppRole, INVITABLE_ROLES } from './rbac-shared';

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

export async function getUserRole(tenantId: string, userId: string): Promise<AppRole> {
  const [row] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(and(eq(userRoles.tenantId, tenantId), eq(userRoles.userId, userId)));

  return (row?.role as AppRole) || 'owner';
}

export async function assignUserRole(tenantId: string, userId: string, role: AppRole) {
  await db
    .insert(userRoles)
    .values({ tenantId, userId, role })
    .onConflictDoUpdate({
      target: [userRoles.userId, userRoles.tenantId],
      set: { role },
    });
}

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

export async function requirePermission(
  tenantId: string,
  userId: string,
  permission: string,
): Promise<{ ok: true; role: AppRole } | { ok: false; error: string }> {
  const role = await getUserRole(tenantId, userId);
  if (!roleCan(role, permission)) {
    return { ok: false, error: `Нямате право: ${permission} (роля: ${role})` };
  }
  return { ok: true, role };
}
