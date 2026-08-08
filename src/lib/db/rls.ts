import { sql } from 'drizzle-orm';
import { db } from './db';

/**
 * RLS контекст на една заявка/операция.
 * Пределес: `role` и `userId` могат да бъдат null — тогава RLS-политиките,
 * които зависят от тях (например journal_headers), отказват достъп.
 */
export interface TenantContext {
  tenantId: string;
  userId: string | null;
  role: string | null;
}

type TransactionDb = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown ? T : never;

/**
 * Изпълний операцията вътре в транзиция с RLS сесий контекст
 * (app.current_tenant_id / app.current_user_id / app.current_user_role).
 *
 * Заедно с политиките от src/lib/db/rls.sql това гарантира, че всяко
 * tenant-sensitive действие върви в правилния tenant контекст и че при
 * не-owner DB роля или FORCE ROW LEVEL SECURITY активиран, Postgres сам
 * ограничава достъпа. Без контекст (null tenantId) операцията се отказва.
 */
export function withTenantContext<T>(
  ctx: TenantContext,
  fn: (tx: TransactionDb) => Promise<T>,
): Promise<T> {
  if (!ctx.tenantId) {
    return Promise.reject(new Error('RLS context requires a tenantId.'));
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT
        set_config('app.current_tenant_id', ${ctx.tenantId}, true),
        set_config('app.current_user_id', ${ctx.userId ?? ''}, true),
        set_config('app.current_user_role', ${ctx.role ?? 'system'}, true)
    `);
    return fn(tx);
  });
}