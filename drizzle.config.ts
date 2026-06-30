import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL ?? '';
const needsSsl =
  databaseUrl.includes('render.com') ||
  databaseUrl.includes('sslmode=require') ||
  databaseUrl.includes('neon.tech') ||
  databaseUrl.includes('supabase.co');

export default defineConfig({
  schema: './src/lib/db/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
    ...(needsSsl ? { ssl: 'require' as const } : {}),
  },
});
