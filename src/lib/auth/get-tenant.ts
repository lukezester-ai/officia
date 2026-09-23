import { auth } from '@clerk/nextjs/server';
import { db, getClient } from '@/lib/db/db';
import { sql } from 'drizzle-orm';
import { cache } from 'react';
import { bindRequestRlsContext, setRlsGucs } from '@/lib/db/rls-session';
import { assertApplicationDbRole } from '@/lib/db/assert-app-role';

/**
 * Clerk → reserved DB session → membership → tenant RLS GUCs.
 */
export const requireTenant = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const client = getClient();
  await assertApplicationDbRole(client);

  await bindRequestRlsContext({
    client,
    clerkId: userId,
  });

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
    throw new Error(`Потребителят не е намерен (clerk_id=${userId})`);
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
  });

  let tenant: any = null;
  const tRows: any = await db.execute(
    sql`SELECT id, name, bulstat, vat_number, address FROM tenants WHERE id = ${tenantId} LIMIT 1`
  );
  tenant = Array.isArray(tRows) ? tRows[0] : tRows?.rows?.[0] ?? null;

  if (!tenant) {
    throw new Error('Tenant access denied');
  }

  return { tenantId, tenant, userId, user: userRow, role };
});
