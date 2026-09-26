ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS external_account_id text;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS requisition_id text;

CREATE TABLE IF NOT EXISTS bank_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  reference text NOT NULL,
  requisition_id text NOT NULL,
  institution_id text NOT NULL,
  institution_name text,
  status text DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bank_links_reference_idx ON bank_links(reference);

DO $$
BEGIN
  IF to_regprocedure('current_tenant_id()') IS NOT NULL
     AND to_regprocedure('current_membership_active()') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE bank_links ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS bank_links_tenant_scope ON bank_links';
    EXECUTE 'CREATE POLICY bank_links_tenant_scope ON bank_links FOR ALL USING (tenant_id = current_tenant_id() AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id() AND current_membership_active())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON bank_links TO officia_app';
  END IF;
END $$;
