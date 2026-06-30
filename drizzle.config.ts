import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

function normalizeDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return rawUrl
      .replace(/([?&])channel_binding=[^&]*(&)?/g, (_, sep, amp) => (amp ? sep : ''))
      .replace(/[?&]$/, '');
  }
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL ?? '');
const needsSsl =
  databaseUrl.includes('neon.tech') ||
  databaseUrl.includes('render.com') ||
  databaseUrl.includes('sslmode=require') ||
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
