import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type SqlClient = ReturnType<typeof import('postgres')>;
type Reserved = Awaited<ReturnType<SqlClient['reserve']>>;
export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

type RlsStore = {
  db: AppDb;
  reserved: Reserved;
};

export const rlsAls = new AsyncLocalStorage<RlsStore>();

async function releaseStore(store: RlsStore) {
  try {
    await store.reserved`
      SELECT
        set_config('app.current_tenant_id', '', false),
        set_config('app.current_user_id', '', false),
        set_config('app.current_user_role', '', false),
        set_config('app.current_clerk_id', '', false)
    `;
  } catch {
    // Connection may already be closed at request end.
  } finally {
    store.reserved.release();
  }
}

export async function ensureRequestConnection(client: SqlClient): Promise<RlsStore> {
  const existing = rlsAls.getStore();
  if (existing) return existing;
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    throw new Error('RLS session requires the Node.js runtime');
  }
  if (typeof client.reserve !== 'function') {
    throw new Error('Postgres client cannot reserve a session');
  }

  const reserved = await Promise.race([
    client.reserve(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('RLS session timed out')), 8_000);
    }),
  ]);
  const scopedDb = drizzle(reserved, { schema });
  const store: RlsStore = { db: scopedDb, reserved };
  rlsAls.enterWith(store);

  try {
    const { after } = await import('next/server');
    after(() => {
      void releaseStore(store);
    });
  } catch {
    // Keep the reserved connection for the rest of this Node process request.
  }

  return store;
}

export async function setRlsGucs(opts: {
  clerkId?: string;
  tenantId?: string;
  userId?: string;
  role?: string;
}): Promise<void> {
  const store = rlsAls.getStore();
  if (!store) {
    throw new Error('RLS session is not open');
  }
  // Reserved connection: session GUCs last for the request. The E2E gate uses
  // SET LOCAL in a transaction after LOGIN as the application role.
  await store.reserved`
    SELECT
      set_config('app.current_clerk_id', ${opts.clerkId ?? ''}, false),
      set_config('app.current_tenant_id', ${opts.tenantId ?? ''}, false),
      set_config('app.current_user_id', ${opts.userId ?? ''}, false),
      set_config('app.current_user_role', ${opts.role ?? ''}, false)
  `;
}

export async function bindRequestRlsContext(opts: {
  client: SqlClient;
  clerkId?: string;
  tenantId?: string;
  userId?: string;
  role?: string;
}): Promise<RlsStore> {
  const store = await ensureRequestConnection(opts.client);
  await setRlsGucs({
    clerkId: opts.clerkId,
    tenantId: opts.tenantId,
    userId: opts.userId,
    role: opts.role,
  });
  return store;
}
