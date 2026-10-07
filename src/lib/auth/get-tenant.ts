import { auth } from '@clerk/nextjs/server';
import { db, getClient } from '@/lib/db/db';
import { sql } from 'drizzle-orm';
import { cache } from 'react';
import { bindRequestRlsContext, rlsAls, setRlsGucs } from '@/lib/db/rls-session';
import { assertApplicationDbRole } from '@/lib/db/assert-app-role';
import { provisionClerkUser } from '@/lib/auth/provision-user';

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
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

/**
 * Clerk → reserved DB session → membership → tenant RLS GUCs.
 */
async function resolveTenant() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const client = getClient();
  await assertApplicationDbRole(client);

  const store = await bindRequestRlsContext({
    client,
    clerkId: userId,
  });

  return rlsAls.run(store, async () => {
    let tenantId: string | null = null;
    let userRow: any = null;

    try {
      const rows: any = await db.execute(
        sql`SELECT id, tenant_id, is_active FROM users WHERE clerk_id = ${userId} LIMIT 1`
      );

      const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
      if (row) {
        tenantId = row.tenant_id ?? row.tenantId ?? null;
        userRow = row;
      }
    } catch (e: any) {
      const fullMsg = [e?.message, e?.cause?.message, e?.detail].filter(Boolean).join(' | ');
      throw new Error(`DB Error: ${fullMsg}`);
    }

    if (!userRow) {
      try {
        await provisionClerkUser(userId);
      } catch (error) {
        console.error('[provision]', error);
      }
      const created: any = await db.execute(
        sql`SELECT id, tenant_id, is_active FROM users WHERE clerk_id = ${userId} LIMIT 1`
      );
      const createdRow = Array.isArray(created) ? created[0] : created?.rows?.[0];
      if (!createdRow) {
        throw new Error(`Потребителят не е намерен (clerk_id=${userId})`);
      }
      tenantId = createdRow.tenant_id ?? createdRow.tenantId ?? null;
      userRow = createdRow;
    }

    const isActive = userRow.is_active ?? userRow.isActive;
    if (isActive === false || isActive === 'false') {
      throw new Error('Inactive membership');
    }

    if (!tenantId) {
      throw new Error('Потребителят не принадлежи към tenant');
    }

    const internalUserId = String(userRow.id ?? userRow.user_id ?? '');
    const role = 'owner';

    await setRlsGucs({
      clerkId: userId,
      tenantId,
      userId: internalUserId,
      role,
      store,
    });

    let tenant: any = null;
    const tRows: any = await db.execute(
      sql`SELECT id, name, bulstat, vat_number, address, plan, subscription_status, trial_ends_at, created_at FROM tenants WHERE id = ${tenantId} LIMIT 1`
    );
    tenant = Array.isArray(tRows) ? tRows[0] : tRows?.rows?.[0] ?? null;

    if (!tenant) {
      throw new Error('Tenant access denied');
    }

    return { tenantId, tenant, userId, user: userRow, role };
  });
}

export const requireTenant = cache(() =>
  withDeadline(resolveTenant(), 12_000).catch((error: unknown) => {
    if (error instanceof Error && (error.message === 'timeout' || error.message === 'RLS session timed out')) {
      throw new Error('Връзката с базата не отговори навреме.');
    }
    throw error;
  }),
);
