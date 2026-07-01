'use server';

import { randomBytes } from 'crypto';
import { db } from '@/lib/db/db';
import { tenantInvites, userRoles } from '@/lib/db/schema/access';
import { users } from '@/lib/db/schema/users';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { requirePermission, INVITABLE_ROLES, type AppRole, assignUserRole } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';

export async function getTeamMembers() {
  const { tenantId } = await requireTenant();
  const members = await db
    .select({
      userId: userRoles.userId,
      role: userRoles.role,
      email: users.email,
      name: users.name,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(eq(userRoles.tenantId, tenantId));

  const pending = await db
    .select()
    .from(tenantInvites)
    .where(
      and(
        eq(tenantInvites.tenantId, tenantId),
        isNull(tenantInvites.acceptedAt),
        gt(tenantInvites.expiresAt, new Date()),
      ),
    );

  return { success: true as const, data: { members, pending } };
}

export async function createTeamInvite(input: { email: string; role: AppRole; lang?: string }) {
  const { tenantId, user } = await requireTenant();
  const perm = await requirePermission(tenantId, user.id, 'team:invite');
  if (!perm.ok) return { success: false as const, error: perm.error };

  if (!INVITABLE_ROLES.includes(input.role) && input.role !== 'owner') {
    return { success: false as const, error: 'Невалидна роля' };
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(tenantInvites).values({
    tenantId,
    email: input.email.toLowerCase().trim(),
    role: input.role,
    token,
    invitedBy: user.id,
    expiresAt,
  });

  const lang = input.lang || 'bg';
  revalidatePath('/', 'layout');
  return {
    success: true as const,
    inviteUrl: `/${lang}/accept-invite?token=${token}`,
    token,
  };
}

export async function acceptTeamInvite(token: string) {
  const { tenantId, user } = await requireTenant();

  const [invite] = await db
    .select()
    .from(tenantInvites)
    .where(
      and(
        eq(tenantInvites.token, token),
        isNull(tenantInvites.acceptedAt),
        gt(tenantInvites.expiresAt, new Date()),
      ),
    );

  if (!invite) return { success: false as const, error: 'Невалидна или изтекла покана' };
  if (invite.email !== user.email.toLowerCase()) {
    return { success: false as const, error: 'Invite email does not match your account' };
  }

  if (user.tenantId !== invite.tenantId) {
    await db.update(users).set({ tenantId: invite.tenantId }).where(eq(users.id, user.id));
  }

  await assignUserRole(invite.tenantId, user.id, invite.role as AppRole);
  await db
    .update(tenantInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(tenantInvites.id, invite.id));

  revalidatePath('/', 'layout');
  return { success: true as const };
}
