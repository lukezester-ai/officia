// @ts-nocheck
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

const client = globalForDb.postgresClient ?? postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? false : 'require',
  max: 15,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') globalForDb.postgresClient = client;

export const db = drizzle(client, { schema });
