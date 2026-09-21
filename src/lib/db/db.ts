import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

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
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const isLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  return postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? false : 'require',
    max: isProductionBuild() ? 1 : 15,
    idle_timeout: 20,
    connect_timeout: isProductionBuild() ? 2 : 10,
  });
}

function getClient(): SqlClient {
  if (!globalForDb.postgresClient) {
    if (isProductionBuild()) {
      throw new Error('Database connections are disabled during production build');
    }
    globalForDb.postgresClient = createClient();
  }
  return globalForDb.postgresClient;
}

function getDb(): Db {
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = drizzle(getClient(), { schema });
  }
  return globalForDb.drizzleDb;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
