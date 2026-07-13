import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { sql } from 'drizzle-orm';

/**
 * Взима текущия tenant (работно пространство) за логнатия потребител.
 * Използва raw SQL за максимална съвместимост с production DB schema.
 */
export async function requireTenant() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  // Raw SQL – заобикаля Drizzle schema mapping, работи с всяка версия на DB
  let userRows: any[];
  try {
    const result = await db.execute(
      sql`SELECT id, tenant_id, clerk_id, email, name FROM users WHERE clerk_id = ${userId} LIMIT 1`
    );
    userRows = Array.isArray(result) ? result : (result as any)?.rows ?? [];
  } catch (e: any) {
    throw new Error(`DB грешка при търсене на потребител: ${e?.message}`);
  }

  if (!userRows || userRows.length === 0) {
    throw new Error('Потребителят не е намерен в базата данни');
  }

  const tenantId: string = userRows[0].tenant_id;

  if (!tenantId) {
    throw new Error('Потребителят не принадлежи към никой tenant');
  }

  // Взимаме данните за tenant-а
  let tenantRows: any[] = [];
  try {
    const tenantResult = await db.execute(
      sql`SELECT id, name FROM tenants WHERE id = ${tenantId} LIMIT 1`
    );
    tenantRows = Array.isArray(tenantResult) ? tenantResult : (tenantResult as any)?.rows ?? [];
  } catch {
    // tenant query е необезопасена – продължаваме без tenant данни
  }

  return {
    tenantId,
    tenant: tenantRows[0] || null,
    userId,
    user: userRows[0],
  };
}
