CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  account_id uuid NOT NULL REFERENCES bank_accounts(id),
  kind text NOT NULL,
  beneficiary_name text NOT NULL,
  beneficiary_iban text NOT NULL,
  amount text NOT NULL,
  currency text DEFAULT 'EUR',
  reason text NOT NULL,
  budget_code text,
  liable_id text,
  document_number text,
  document_date text,
  period text,
  status text DEFAULT 'draft',
  created_at timestamp DEFAULT now()
);

DO $$
BEGIN
  IF to_regprocedure('current_tenant_id()') IS NOT NULL
     AND to_regprocedure('current_membership_active()') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS payment_orders_tenant_scope ON payment_orders';
    EXECUTE 'CREATE POLICY payment_orders_tenant_scope ON payment_orders FOR ALL USING (tenant_id = current_tenant_id() AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id() AND current_membership_active())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'officia_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON payment_orders TO officia_app';
  END IF;
END $$;
