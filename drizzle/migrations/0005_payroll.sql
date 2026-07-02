DO $$ BEGIN
 CREATE TYPE "payroll_status" AS ENUM('draft', 'posted', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "month" date NOT NULL,
  "status" "payroll_status" DEFAULT 'draft' NOT NULL,
  "max_insurance_base" numeric(12,2) NOT NULL,
  "employee_insurance_rate" numeric(6,3) NOT NULL,
  "employer_insurance_rate" numeric(6,3) NOT NULL,
  "income_tax_rate" numeric(6,3) NOT NULL,
  "total_gross" numeric(15,2) DEFAULT '0' NOT NULL,
  "total_employee_insurance" numeric(15,2) DEFAULT '0' NOT NULL,
  "total_employer_insurance" numeric(15,2) DEFAULT '0' NOT NULL,
  "total_tax" numeric(15,2) DEFAULT '0' NOT NULL,
  "total_net" numeric(15,2) DEFAULT '0' NOT NULL,
  "total_employer_cost" numeric(15,2) DEFAULT '0' NOT NULL,
  "journal_header_id" uuid REFERENCES "journal_headers"("id"),
  "created_by" uuid REFERENCES "users"("id"),
  "posted_by" uuid REFERENCES "users"("id"),
  "posted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_batches_tenant_month_idx" ON "payroll_batches" ("tenant_id", "month");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "payroll_batches"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "employee_id" uuid NOT NULL REFERENCES "employees"("id"),
  "employee_name" text NOT NULL,
  "position" text,
  "base_salary" numeric(12,2) NOT NULL,
  "working_days" integer NOT NULL,
  "worked_days" integer NOT NULL,
  "bonus" numeric(12,2) DEFAULT '0' NOT NULL,
  "other_taxable" numeric(12,2) DEFAULT '0' NOT NULL,
  "other_deductions" numeric(12,2) DEFAULT '0' NOT NULL,
  "gross" numeric(12,2) NOT NULL,
  "insurance_base" numeric(12,2) NOT NULL,
  "employee_insurance" numeric(12,2) NOT NULL,
  "employer_insurance" numeric(12,2) NOT NULL,
  "income_tax" numeric(12,2) NOT NULL,
  "net" numeric(12,2) NOT NULL,
  "employer_cost" numeric(12,2) NOT NULL,
  "has_warning" boolean DEFAULT false NOT NULL,
  "warning" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_items_batch_employee_idx" ON "payroll_items" ("batch_id", "employee_id");
