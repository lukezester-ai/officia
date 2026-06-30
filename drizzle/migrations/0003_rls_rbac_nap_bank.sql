-- RLS helpers
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS text AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_user_role() RETURNS text AS $$
  SELECT coalesce(nullif(current_setting('app.current_user_role', true), ''), 'owner');
$$ LANGUAGE sql STABLE;

-- RBAC: user roles per tenant
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL DEFAULT 'owner',
  created_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

-- Team invites
CREATE TABLE IF NOT EXISTS tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'junior_accountant',
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id),
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Bank PSD2 metadata
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS provider text DEFAULT 'manual';
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS institution_id text;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS external_requisition_id text;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS external_account_id text;

-- NAP submission log
CREATE TABLE IF NOT EXISTS nap_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  reference_number text,
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  submitted_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now()
);

-- Enable RLS on tenant-scoped tables
ALTER TABLE journal_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON journal_headers;
CREATE POLICY tenant_isolation ON journal_headers
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON invoices;
CREATE POLICY tenant_isolation ON invoices
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON employees;
CREATE POLICY tenant_isolation ON employees
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON bank_accounts;
CREATE POLICY tenant_isolation ON bank_accounts
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON vat_journals;
CREATE POLICY tenant_isolation ON vat_journals
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON fixed_assets;
CREATE POLICY tenant_isolation ON fixed_assets
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
  FOR ALL
  USING (tenant_id::text = app_current_tenant_id())
  WITH CHECK (tenant_id::text = app_current_tenant_id());
