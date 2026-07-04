import 'server-only';

import { db } from '@/lib/db/db';
import { userRoles } from '@/lib/db/schema/access';
import { and, eq } from 'drizzle-orm';
<<<<<<< HEAD
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
    'ai:approve',
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
=======
import type { AppRole } from './rbac-types';
import { roleCan } from './rbac-types';
>>>>>>> 4f9afa8 (Add purchase invoices migration and update env to use port 3001)

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
