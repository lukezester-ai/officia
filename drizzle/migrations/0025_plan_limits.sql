ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;

UPDATE tenants
SET trial_ends_at = now() + interval '14 days'
WHERE trial_ends_at IS NULL;

CREATE TABLE IF NOT EXISTS tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_invites_tenant_email_idx ON tenant_invites (tenant_id, email);

DO $$
BEGIN
  IF to_regprocedure('current_tenant_id()') IS NOT NULL
     AND to_regprocedure('current_membership_active()') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_invites_tenant_scope ON tenant_invites';
    EXECUTE 'CREATE POLICY tenant_invites_tenant_scope ON tenant_invites FOR ALL USING (tenant_id = current_tenant_id() AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id() AND current_membership_active())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_invites TO officia_app';
  END IF;
END $$;
