ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "birth_year" integer;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "economic_activity_code" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "insurance_category" text DEFAULT 'third';
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "minimum_insurance_income" numeric(12,2);
ALTER TABLE "contribution_rates" ADD COLUMN IF NOT EXISTS "minimum_insurance_income" numeric(12,2);
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "contribution_fund" AS ENUM('doo_pension', 'doo_ozm', 'doo_unemployment', 'health', 'dzpo', 'accident', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "contribution_payer" AS ENUM('employee', 'employer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE TABLE IF NOT EXISTS "contribution_rate_components" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contribution_rate_id" uuid NOT NULL REFERENCES "contribution_rates"("id") ON DELETE CASCADE,
  "fund" "contribution_fund" NOT NULL,
  "payer" "contribution_payer" NOT NULL,
  "rate_percent" numeric(7,4) NOT NULL,
  "applies_to" text DEFAULT 'all' NOT NULL,
  "economic_activity_code" text,
  "insurance_category" text,
  "min_base" numeric(12,2),
  "max_base" numeric(12,2),
  "source_url" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "contribution_rate_components_rate_idx" ON "contribution_rate_components" ("contribution_rate_id", "payer", "fund");
CREATE INDEX IF NOT EXISTS "contribution_rate_components_applicability_idx" ON "contribution_rate_components" ("economic_activity_code", "insurance_category", "applies_to");
--> statement-breakpoint
UPDATE "contribution_rates"
SET "minimum_insurance_income" = COALESCE("minimum_insurance_income", "minimum_wage", 620.20)
WHERE "year" = 2026 AND "tenant_id" IS NULL;
--> statement-breakpoint
WITH rate AS (
  SELECT "id"
  FROM "contribution_rates"
  WHERE "tenant_id" IS NULL AND "year" = 2026 AND "valid_from" = '2026-01-01'
  ORDER BY "created_at"
  LIMIT 1
), components("fund", "payer", "rate_percent", "applies_to", "metadata") AS (
  VALUES
    ('doo_pension'::contribution_fund, 'employee'::contribution_payer, 10.5800::numeric, 'all', '{"includedInAggregate":true}'::jsonb),
    ('health'::contribution_fund, 'employee'::contribution_payer, 3.2000::numeric, 'all', '{"formula":"insurance_base * 0.032"}'::jsonb),
    ('doo_pension'::contribution_fund, 'employer'::contribution_payer, 13.8200::numeric, 'all', '{"includedInAggregate":true}'::jsonb),
    ('health'::contribution_fund, 'employer'::contribution_payer, 4.8000::numeric, 'all', '{"formula":"insurance_base * 0.048"}'::jsonb),
    ('accident'::contribution_fund, 'employer'::contribution_payer, 0.5000::numeric, 'activity_specific', '{"example":true,"note":"ТЗПБ зависи от икономическата дейност и трябва да се настрои по tenant."}'::jsonb)
)
INSERT INTO "contribution_rate_components" ("contribution_rate_id", "fund", "payer", "rate_percent", "applies_to", "source_url", "metadata")
SELECT rate."id", components."fund", components."payer", components."rate_percent", components."applies_to",
  'https://www.noi.bg/wp-content/uploads/1_OV-tryd-dog-2000-2026.pdf',
  components."metadata"
FROM rate, components
WHERE NOT EXISTS (
  SELECT 1
  FROM "contribution_rate_components" existing
  WHERE existing."contribution_rate_id" = rate."id"
    AND existing."fund" = components."fund"
    AND existing."payer" = components."payer"
);
--> statement-breakpoint
ALTER TABLE "contribution_rate_components" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_or_global_rate_components ON "contribution_rate_components";
CREATE POLICY tenant_or_global_rate_components ON "contribution_rate_components"
USING (
  EXISTS (
    SELECT 1
    FROM "contribution_rates" cr
    WHERE cr."id" = "contribution_rate_components"."contribution_rate_id"
      AND (cr."tenant_id" IS NULL OR cr."tenant_id" = current_setting('app.tenant_id', true)::uuid)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "contribution_rates" cr
    WHERE cr."id" = "contribution_rate_components"."contribution_rate_id"
      AND cr."tenant_id" = current_setting('app.tenant_id', true)::uuid
  )
);
