import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getAppDatabaseUrl } from './connection-urls';
import { rlsAls } from './rls-session';

type SqlClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  postgresClient: SqlClient | undefined;
  drizzleDb: Db | undefined;
};

function isProductionBuild() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

function createClient(): SqlClient {
  const connectionString = getAppDatabaseUrl();

  const isLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  return postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? false : 'require',
    max: isProductionBuild() ? 1 : 4,
    idle_timeout: 10,
    connect_timeout: 5,
    max_lifetime: 60 * 5,
  });
}

export function getClient(): SqlClient {
  if (!globalForDb.postgresClient) {
    if (isProductionBuild()) {
      throw new Error('Database connections are disabled during production build');
    }
    globalForDb.postgresClient = createClient();
  }
  return globalForDb.postgresClient;
}

function getPoolDb(): Db {
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = drizzle(getClient(), { schema });
  }
  return globalForDb.drizzleDb;
}

function activeDb(): Db {
  return rlsAls.getStore()?.db ?? getPoolDb();
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = activeDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
