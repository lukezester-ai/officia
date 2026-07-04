import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema/users';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';
import { provisionUserFromClerk } from '@/lib/auth/provision-user';
import { getUserRole } from '@/lib/auth/rbac';
import type { AppRole } from '@/lib/auth/rbac-types';
import { withTenantContext, type DbClient } from '@/lib/db/tenant-db';
import { ensureAuthSchema } from '@/lib/auth/ensure-auth-schema';

const userContextColumns = {
  id: users.id,
  tenantId: users.tenantId,
  clerkId: users.clerkId,
  email: users.email,
  name: users.name,
};

const tenantContextColumns = {
  id: tenants.id,
  name: tenants.name,
  bulstat: tenants.bulstat,
  vatNumber: tenants.vatNumber,
  address: tenants.address,
  plan: tenants.plan,
  trialEndsAt: tenants.trialEndsAt,
  stripeCustomerId: tenants.stripeCustomerId,
  stripeSubscriptionId: tenants.stripeSubscriptionId,
  createdAt: tenants.createdAt,
};

/**
 * Взима текущия tenant (работно пространство) за логнатия потребител.
 * Хвърля грешка, ако потребителят не е логнат или няма достъп.
 */
export async function requireTenant() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  await ensureAuthSchema();

  let userRecords = await db.select(userContextColumns).from(users).where(eq(users.clerkId, userId));

  if (userRecords.length === 0) {
    await provisionUserFromClerk(userId);
    userRecords = await db.select(userContextColumns).from(users).where(eq(users.clerkId, userId));
  }

  if (userRecords.length === 0) {
    throw new Error('User not found in local database');
  }

  const tenantId = userRecords[0].tenantId;

  if (!tenantId) {
    throw new Error('User does not belong to any tenant');
  }

  const tenantRecords = await db.select(tenantContextColumns).from(tenants).where(eq(tenants.id, tenantId));
  const role = await getUserRole(tenantId, userRecords[0].id);

  return {
    tenantId,
    tenant: tenantRecords[0] || null,
    userId,
    user: userRecords[0],
    role,
  };
}

export async function withTenantDb<T>(fn: (database: DbClient) => Promise<T>): Promise<T> {
  const ctx = await requireTenant();
  return withTenantContext(
    { tenantId: ctx.tenantId, userId: ctx.user.id, role: ctx.role as AppRole },
    fn,
  );
}
