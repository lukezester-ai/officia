DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('draft', 'active', 'expired', 'terminated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  title varchar(255) NOT NULL,
  counterparty_id uuid,
  description text,
  status contract_status NOT NULL DEFAULT 'draft',
  start_date timestamp,
  end_date timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS counterparty_id uuid;

CREATE TABLE IF NOT EXISTS contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  version_number varchar(50) NOT NULL,
  content_url varchar(500),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  party_name varchar(255) NOT NULL,
  party_role varchar(100),
  contact_email varchar(255),
  created_at timestamp NOT NULL DEFAULT now()
);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contracts', 'contract_versions', 'contract_parties']
  LOOP
    IF to_regprocedure('current_tenant_id()') IS NOT NULL
       AND to_regprocedure('current_membership_active()') IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_scope', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = current_tenant_id() AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id() AND current_membership_active())',
        t || '_tenant_scope',
        t
      );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_app') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO officia_app', t);
    END IF;
  END LOOP;
END $$;
