ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" text DEFAULT 'inactive';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_unique_idx" ON "users" ("clerk_id");
