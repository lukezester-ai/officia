import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getPostgresClientOptions } from './postgres-client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const { url, options } = getPostgresClientOptions(connectionString);
const client = postgres(url, options);

export const db = drizzle(client, { schema });
