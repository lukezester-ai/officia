import { auth } from '@clerk/nextjs/server';
import { db, getClient } from '@/lib/db/db';
import { sql } from 'drizzle-orm';
import { cache } from 'react';
import { bindRequestRlsContext } from '@/lib/db/rls-session';

/**
 * Взима текущия tenant за логнатия потребител и закача PostgreSQL RLS GUCs
 * към заявката (app.current_tenant_id / user / role).
 */
export const requireTenant = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  let tenantId: string | null = null;
  let userRow: any = null;

  try {
    const rows: any = await db.execute(
      sql`SELECT id, tenant_id FROM users WHERE clerk_id = ${userId} LIMIT 1`
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

  if (!tenantId) {
    throw new Error('Потребителят не принадлежи към tenant');
  }

  const internalUserId = String(userRow.id ?? userRow.user_id ?? '');
  const role = 'owner';

  try {
    await bindRequestRlsContext({
      client: getClient(),
      tenantId,
      userId: internalUserId,
      role,
    });
  } catch (error) {
    console.error('[rls-bind]', error);
  }

  let tenant: any = null;
  try {
    const tRows: any = await db.execute(
      sql`SELECT id, name, bulstat, vat_number, address FROM tenants WHERE id = ${tenantId} LIMIT 1`
    );
    tenant = Array.isArray(tRows) ? tRows[0] : tRows?.rows?.[0] ?? null;
  } catch {
    // Продължаваме без tenant данни
  }

  return { tenantId, tenant, userId, user: userRow, role };
});
