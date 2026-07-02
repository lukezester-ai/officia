import 'server-only';

import postgres from 'postgres';
import { getPostgresClientOptions } from '@/lib/db/postgres-client';

let repairPromise: Promise<void> | null = null;

async function runAuthSchemaRepair() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const { url, options } = getPostgresClientOptions(rawUrl);
  const sql = postgres(url, {
    ...options,
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    onnotice: () => {},
  });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL DEFAULT 'Нова фирма',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;

    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "bulstat" text`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "vat_number" text`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "address" text`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'starter'`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`;
    await sql`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`;

    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clerk_id" text,
        "email" text,
        "name" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;

    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid()`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" uuid`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_id" text`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" text DEFAULT 'inactive'`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20)`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`;
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`;

    await sql`UPDATE "users" SET "id" = gen_random_uuid() WHERE "id" IS NULL`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_unique_idx"
      ON "users" ("clerk_id")
      WHERE "clerk_id" IS NOT NULL
    `;
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

export async function ensureAuthSchema() {
  repairPromise ??= runAuthSchemaRepair().catch((error) => {
    repairPromise = null;
    throw error;
  });

  return repairPromise;
}
