import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type SqlClient = ReturnType<typeof import('postgres')>;
export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

type RlsStore = {
  db: AppDb;
};

export const rlsAls = new AsyncLocalStorage<RlsStore>();

export async function bindRequestRlsContext(opts: {
  client: SqlClient;
  tenantId: string;
  userId: string;
  role: string;
}): Promise<void> {
  if (rlsAls.getStore()) return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (typeof opts.client.reserve !== 'function') return;

  const reserved = await opts.client.reserve();
  await reserved`
    SELECT
      set_config('app.current_tenant_id', ${opts.tenantId}, false),
      set_config('app.current_user_id', ${opts.userId}, false),
      set_config('app.current_user_role', ${opts.role}, false)
  `;

  const scopedDb = drizzle(reserved, { schema });
  rlsAls.enterWith({ db: scopedDb });

  const release = async () => {
    try {
      await reserved`
        SELECT
          set_config('app.current_tenant_id', '', false),
          set_config('app.current_user_id', '', false),
          set_config('app.current_user_role', '', false)
      `;
    } catch {
      // Connection may already be closed at request end.
    } finally {
      reserved.release();
    }
  };

  try {
    const { after } = await import('next/server');
    after(() => {
      void release();
    });
  } catch {
    // Keep the reserved connection for the rest of this Node process request.
  }
}
