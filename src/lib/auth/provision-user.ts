import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { isPlanId, rulesFor, trialEndsFrom } from '@/lib/billing/plan-rules';
import { db } from '@/lib/db/db';
import { tenantInvites, tenants, users } from '@/lib/db/schema';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function syncTenantMetadata(clerkId: string, tenantId: string) {
  try {
    const client = await clerkClient();
    await withTimeout(
      client.users.updateUser(clerkId, { publicMetadata: { tenantId } }),
      8_000,
    );
  } catch (error) {
    console.error('[provision] metadata', error);
  }
}

export async function provisionClerkUser(clerkId: string) {
  const [existing] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing?.tenantId) {
    await syncTenantMetadata(clerkId, existing.tenantId);
    return;
  }

  const client = await clerkClient();
  const clerkUser = await withTimeout(client.users.getUser(clerkId), 8_000);
  const email = clerkUser.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error('Google акаунтът няма имейл и фирмата не може да се създаде.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() || normalizedEmail;
  const [invite] = await db.select().from(tenantInvites).where(eq(tenantInvites.email, normalizedEmail)).limit(1);

  let tenantId: string | null = invite?.tenantId ?? null;
  if (invite && tenantId) {
    const seats = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId));
    const pending = await db.select({ id: tenantInvites.id }).from(tenantInvites).where(eq(tenantInvites.tenantId, tenantId));
    const occupied = seats.length + pending.filter((row) => row.id !== invite.id).length;
    const [company] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const plan = isPlanId(company?.plan) ? company.plan : 'starter';
    const cap = rulesFor(plan).limits.users;
    if (cap != null && occupied >= cap) {
      tenantId = null;
    } else {
      await db.delete(tenantInvites).where(eq(tenantInvites.id, invite.id));
    }
  }

  if (!tenantId) {
    const [created] = await db.insert(tenants).values({
      name: `${name} - фирма`,
      plan: 'starter',
      subscriptionStatus: 'trialing',
      trialEndsAt: trialEndsFrom(new Date()),
    }).returning({ id: tenants.id });
    tenantId = created?.id ?? null;
  }

  if (!tenantId) {
    throw new Error('Фирмата не се създаде след входа с Google.');
  }

  await db.insert(users).values({
    clerkId,
    email,
    name,
    tenantId,
  }).onConflictDoNothing({ target: users.clerkId });

  const [row] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!row?.tenantId) {
    throw new Error('Фирмата не се създаде след входа с Google.');
  }

  await syncTenantMetadata(clerkId, row.tenantId);
}
