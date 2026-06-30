import { db } from '@/lib/db/db';
import { setRLSContext } from '@/lib/db/rls_utils';

type TenantContext = {
  tenantId: string;
  userId: string;
  role: string;
};

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type { DbClient };

export async function withTenantContext<T>(
  ctx: TenantContext,
  fn: (database: DbClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await setRLSContext(tx, ctx.tenantId, ctx.userId, ctx.role);
    return fn(tx);
  });
}
