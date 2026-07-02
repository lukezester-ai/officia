ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'calculated';
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE "leave_type" ADD VALUE IF NOT EXISTS 'maternity';
ALTER TYPE "leave_type" ADD VALUE IF NOT EXISTS 'parental';
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "employees" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "employees" ALTER COLUMN "salary" TYPE numeric(12,2);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "personal_identifier_encrypted" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "personal_identifier_hash" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bank_iban_encrypted" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bank_name" text;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "additional_benefits" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS "employees_tenant_personal_identifier_idx" ON "employees" ("tenant_id", "personal_identifier_hash");
CREATE INDEX IF NOT EXISTS "employees_tenant_active_idx" ON "employees" ("tenant_id", "is_active");
--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "days_requested" integer;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "document_id" uuid REFERENCES "documents"("id");
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
CREATE INDEX IF NOT EXISTS "leave_requests_tenant_employee_dates_idx" ON "leave_requests" ("tenant_id", "employee_id", "start_date", "end_date");
--> statement-breakpoint
UPDATE "audit_log" SET "action" = 'UNKNOWN' WHERE "action" IS NULL;
ALTER TABLE "audit_log" ALTER COLUMN "action" SET NOT NULL;
ALTER TABLE "audit_log" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "audit_log_tenant_created_idx" ON "audit_log" ("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" ("table_name", "record_id");
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "employment_contract_kind" AS ENUM('permanent', 'fixed_term', 'civil_contract'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "employment_contract_status" AS ENUM('draft', 'active', 'expired', 'terminated'); EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE TABLE IF NOT EXISTS "employment_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "contract_number" text NOT NULL,
  "kind" "employment_contract_kind" NOT NULL,
  "contract_date" date NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "document_id" uuid REFERENCES "documents"("id"),
  "signed_at" timestamp,
  "status" "employment_contract_status" DEFAULT 'draft' NOT NULL,
  "terms" jsonb DEFAULT '{}'::jsonb,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "employment_contracts_tenant_number_idx" ON "employment_contracts" ("tenant_id", "contract_number");
CREATE INDEX IF NOT EXISTS "employment_contracts_tenant_employee_idx" ON "employment_contracts" ("tenant_id", "employee_id");
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "attendance_type" AS ENUM('worked', 'leave', 'sick', 'holiday', 'overtime', 'unpaid'); EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE TABLE IF NOT EXISTS "attendance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "hours_worked" numeric(5,2) DEFAULT '0' NOT NULL,
  "type" "attendance_type" NOT NULL,
  "description" text,
  "approved" boolean DEFAULT false NOT NULL,
  "approved_by" uuid REFERENCES "users"("id"),
  "approved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_tenant_employee_date_idx" ON "attendance_records" ("tenant_id", "employee_id", "date");
CREATE INDEX IF NOT EXISTS "attendance_records_tenant_date_idx" ON "attendance_records" ("tenant_id", "date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contribution_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "year" integer NOT NULL,
  "employee_doo_rate" numeric(6,3) NOT NULL,
  "employee_health_rate" numeric(6,3) NOT NULL,
  "employee_other_rate" numeric(6,3) DEFAULT '0' NOT NULL,
  "employer_doo_rate" numeric(6,3) NOT NULL,
  "employer_health_rate" numeric(6,3) NOT NULL,
  "employer_other_rate" numeric(6,3) DEFAULT '0' NOT NULL,
  "income_tax_rate" numeric(6,3) NOT NULL,
  "minimum_wage" numeric(12,2),
  "max_insurance_base" numeric(12,2) NOT NULL,
  "valid_from" date NOT NULL,
  "valid_to" date,
  "source_url" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "contribution_rates_tenant_validity_idx" ON "contribution_rates" ("tenant_id", "valid_from", "valid_to");
INSERT INTO "contribution_rates" ("name", "year", "employee_doo_rate", "employee_health_rate", "employee_other_rate", "employer_doo_rate", "employer_health_rate", "employer_other_rate", "income_tax_rate", "minimum_wage", "max_insurance_base", "valid_from", "source_url", "metadata")
SELECT 'Трета категория труд 2026', 2026, 10.58, 3.20, 0, 13.82, 4.80, 0.50, 10.00, 620.20, 2111.64, '2026-01-01', 'https://www.noi.bg/wp-content/uploads/1_OV-tryd-dog-2000-2026.pdf', '{"tZpbRateIsExample":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "contribution_rates" WHERE "tenant_id" IS NULL AND "name" = 'Трета категория труд 2026' AND "valid_from" = '2026-01-01');
--> statement-breakpoint
ALTER TABLE "payroll_batches" ADD COLUMN IF NOT EXISTS "approved_by" uuid REFERENCES "users"("id");
ALTER TABLE "payroll_batches" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
ALTER TABLE "payroll_batches" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;
ALTER TABLE "payroll_batches" ADD COLUMN IF NOT EXISTS "submitted_to_nra_at" timestamp;
ALTER TABLE "payroll_batches" ADD COLUMN IF NOT EXISTS "calculation_metadata" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "payroll_batches" ADD COLUMN IF NOT EXISTS "contribution_rate_id" uuid REFERENCES "contribution_rates"("id");
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "employee_doo" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "employee_health" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "employer_doo" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "employer_health" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "employer_other" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "overtime_pay" numeric(12,2) DEFAULT '0' NOT NULL;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "payment_date" date;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "iban_encrypted" text;
ALTER TABLE "payroll_items" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "employment_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contribution_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "employment_contracts";
CREATE POLICY tenant_isolation ON "employment_contracts" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
DROP POLICY IF EXISTS tenant_isolation ON "attendance_records";
CREATE POLICY tenant_isolation ON "attendance_records" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
DROP POLICY IF EXISTS tenant_or_global_rates ON "contribution_rates";
CREATE POLICY tenant_or_global_rates ON "contribution_rates" USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
DROP POLICY IF EXISTS tenant_isolation ON "payroll_batches";
CREATE POLICY tenant_isolation ON "payroll_batches" USING (tenant_id::text = app_current_tenant_id()) WITH CHECK (tenant_id::text = app_current_tenant_id());
DROP POLICY IF EXISTS tenant_isolation ON "payroll_items";
CREATE POLICY tenant_isolation ON "payroll_items" USING (tenant_id::text = app_current_tenant_id()) WITH CHECK (tenant_id::text = app_current_tenant_id());
DROP POLICY IF EXISTS tenant_isolation ON "leave_requests";
CREATE POLICY tenant_isolation ON "leave_requests" USING (tenant_id::text = app_current_tenant_id()) WITH CHECK (tenant_id::text = app_current_tenant_id());
DROP POLICY IF EXISTS tenant_isolation ON "audit_log";
CREATE POLICY tenant_isolation ON "audit_log" USING (tenant_id::text = app_current_tenant_id()) WITH CHECK (tenant_id::text = app_current_tenant_id());
