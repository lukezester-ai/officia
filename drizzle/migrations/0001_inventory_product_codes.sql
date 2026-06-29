DO $$ BEGIN
  CREATE TYPE "public"."product_code_type" AS ENUM('ean', 'sku', 'supplier', 'internal', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"code" text NOT NULL,
	"code_type" "product_code_type" DEFAULT 'other' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_codes_tenant_code_idx" ON "product_codes" ("tenant_id","code");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
INSERT INTO "product_codes" ("tenant_id", "item_id", "code", "code_type", "is_primary")
SELECT "tenant_id", "id", "sku", 'sku', true
FROM "inventory_items"
WHERE NOT EXISTS (
  SELECT 1 FROM "product_codes" pc
  WHERE pc."tenant_id" = "inventory_items"."tenant_id"
    AND pc."code" = "inventory_items"."sku"
);
