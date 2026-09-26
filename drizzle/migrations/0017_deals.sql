CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  counterparty_id uuid REFERENCES counterparties(id),
  title text NOT NULL,
  amount text NOT NULL,
  currency text DEFAULT 'EUR',
  stage text NOT NULL DEFAULT 'lead',
  expected_close text,
  notes text,
  created_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF to_regprocedure('current_tenant_id()') IS NOT NULL
     AND to_regprocedure('current_membership_active()') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE deals ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS deals_tenant_scope ON deals';
    EXECUTE 'CREATE POLICY deals_tenant_scope ON deals FOR ALL USING (tenant_id = current_tenant_id() AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id() AND current_membership_active())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON deals TO officia_app';
  END IF;
END $$;
