import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
dotenv.config();

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.log('DATABASE_URL is not set; skipping auth users safety check.');
  process.exit(0);
}

function normalizeDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&])channel_binding=[^&]*(&)?/g, (_, sep, amp) => (amp ? sep : ''))
      .replace(/[?&]$/, '');
  }
}

function needsPostgresSsl(url) {
  return (
    url.includes('neon.tech') ||
    url.includes('render.com') ||
    url.includes('sslmode=require') ||
    url.includes('supabase.co')
  );
}

const url = normalizeDatabaseUrl(rawUrl);
const sql = postgres(url, {
  max: 1,
  connect_timeout: 20,
  prepare: false,
  ssl: needsPostgresSsl(url) ? 'require' : undefined,
  onnotice: () => {},
});

try {
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" uuid
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" text DEFAULT 'inactive'
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20)
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()
  `;
  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_unique_idx" ON "users" ("clerk_id")
  `;

  console.log('✓ auth users safety check complete');
} catch (error) {
  console.warn('⚠ auth users safety check skipped:', error instanceof Error ? error.message : error);
  console.warn('The web server will continue to start, but database-backed pages may fail until DATABASE_URL is fixed.');
} finally {
  await sql.end({ timeout: 5 }).catch(() => undefined);
}
