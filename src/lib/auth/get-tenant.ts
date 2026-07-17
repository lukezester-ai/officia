import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { sql } from 'drizzle-orm';
import { cache } from 'react';

/**
 * Взима текущия tenant за логнатия потребител.
 * Използва raw SQL с минимални колони за максимална съвместимост.
 * Кеширан с React cache() в рамките на един HTTP request, за да се избегнат 6+ излишни SQL заявки на всяко зареждане.
 */
export const requireTenant = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  // Минимален raw SQL – само колоните, които задължително съществуват
  let tenantId: string | null = null;
  let userRow: any = null;

  try {
    // Пробваме само id и tenant_id
    const rows: any = await db.execute(
      sql`SELECT id, tenant_id FROM users WHERE clerk_id = ${userId} LIMIT 1`
    );

    const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (row) {
      tenantId = row.tenant_id ?? row.tenantId ?? null;
      userRow  = row;
    }
  } catch (e: any) {
    // Показваме пълния error за диагностика
    const fullMsg = [e?.message, e?.cause?.message, e?.detail].filter(Boolean).join(' | ');
    throw new Error(`DB Error: ${fullMsg}`);
  }

  if (!userRow) {
    throw new Error(`Потребителят не е намерен (clerk_id=${userId})`);
  }

  if (!tenantId) {
    throw new Error('Потребителят не принадлежи към tenant');
  }

  // Tenant данни (optional)
  let tenant: any = null;
  try {
    const tRows: any = await db.execute(
      sql`SELECT id, name FROM tenants WHERE id = ${tenantId} LIMIT 1`
    );
    tenant = Array.isArray(tRows) ? tRows[0] : tRows?.rows?.[0] ?? null;
  } catch {
    // Продължаваме без tenant данни
  }

  return { tenantId, tenant, userId, user: userRow };
});
