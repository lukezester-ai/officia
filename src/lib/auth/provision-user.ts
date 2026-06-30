import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { users, tenants } from '@/lib/db/schema';
import { TRIAL_DAYS } from '@/lib/billing/plans';
import { assignUserRole } from '@/lib/auth/rbac';

export async function provisionUserFromClerk(clerkId: string) {
  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId));
  if (existing.length > 0) {
    return existing[0];
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error('Clerk user has no email address');
  }

  const firstName = clerkUser.firstName || '';
  const lastName = clerkUser.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || email;
  const tenantName = name ? `${name} - фирма` : 'Нова Фирма';

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const [newTenant] = await db
    .insert(tenants)
    .values({
      name: tenantName,
      plan: 'starter',
      trialEndsAt,
    })
    .returning();

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId,
      email,
      name,
      tenantId: newTenant.id,
    })
    .returning();

  await client.users.updateUser(clerkId, {
    publicMetadata: { tenantId: newTenant.id },
  });

  await assignUserRole(newTenant.id, newUser.id, 'owner');

  return newUser;
}
