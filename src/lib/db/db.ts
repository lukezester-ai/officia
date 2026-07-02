import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getPostgresClientOptions } from './postgres-client';

const connectionString = process.env.DATABASE_URL;
type Database = ReturnType<typeof drizzle<typeof schema>>;

function createMissingDatabaseProxy() {
  return new Proxy({}, {
    get() {
      throw new Error('DATABASE_URL is not configured');
    },
  }) as Database;
}

function createDatabase(): Database {
  if (!connectionString) {
    return createMissingDatabaseProxy();
  }

  const { url, options } = getPostgresClientOptions(connectionString);
  return drizzle(postgres(url, options), { schema });
}

export const db = createDatabase();
