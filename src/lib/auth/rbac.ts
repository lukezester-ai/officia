import 'server-only';

import { db } from '@/lib/db/db';
import { userRoles } from '@/lib/db/schema/access';
import { and, eq } from 'drizzle-orm';
import type { AppRole } from './rbac-types';
import { roleCan } from './rbac-types';

export { roleCan };

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
