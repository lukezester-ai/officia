-- ============================================================================
-- Officia — Row Level Security (RLS): пълни, идемпотентни политики
-- ============================================================================
-- Scope: всички tenant-owned таблици (uuid('tenant_id') и text('tenant_id')),
-- включително invoices и employees.
--
-- Role model (preferred over FORCE RLS):
--   migration role  ≠  database owner  ≠  application role
-- Application role is LOGIN, NOSUPERUSER, NOBYPASSRLS, and does not own tables.
-- Ordinary ENABLE ROW LEVEL SECURITY is then enough.
--
-- Runtime:
--   Clerk → requireTenant() → reserved connection + GUCs → query
--   app.current_clerk_id / current_tenant_id / current_user_id / current_user_role
-- Missing GUC context fails closed (NULL → 0 rows). Inactive membership fails closed.
-- FORCE ROW LEVEL SECURITY stays off; do not use it to paper over an owner DATABASE_URL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper функции (fail-closed: липсващ контекст => NULL => 0 достъпни реда)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_user_role', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_clerk_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_clerk_id', true), '');
$$ LANGUAGE sql STABLE;

-- Membership is active only when the bound user belongs to the bound tenant
-- and users.is_active is true. Invoker rights: users RLS still applies.
CREATE OR REPLACE FUNCTION current_membership_active() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = current_user_id()
      AND users.tenant_id = current_tenant_id()
      AND COALESCE(users.is_active, true)
  );
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- 2) journal_headers — базови + ролеви политики
-- ---------------------------------------------------------------------------
ALTER TABLE journal_headers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jh_tenant_select ON journal_headers;
CREATE POLICY jh_tenant_select ON journal_headers
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND current_membership_active()
    AND (current_user_role() <> 'junior_accountant' OR status = 'draft')
  );

DROP POLICY IF EXISTS jh_tenant_insert ON journal_headers;
CREATE POLICY jh_tenant_insert ON journal_headers
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_membership_active()
    AND current_user_role() IN ('owner', 'senior_accountant', 'accountant')
  );

DROP POLICY IF EXISTS jh_tenant_update ON journal_headers;
CREATE POLICY jh_tenant_update ON journal_headers
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_membership_active()
    AND current_user_role() IN ('owner', 'senior_accountant')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_membership_active()
    AND current_user_role() IN ('owner', 'senior_accountant')
    AND status IN ('draft', 'posted', 'canceled')
  );

DROP POLICY IF EXISTS jh_tenant_delete ON journal_headers;
CREATE POLICY jh_tenant_delete ON journal_headers
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_membership_active()
    AND current_user_role() IN ('owner', 'senior_accountant')
  );

DROP POLICY IF EXISTS senior_can_post ON journal_headers;
DROP POLICY IF EXISTS junior_see_drafts_only ON journal_headers;
DROP POLICY IF EXISTS auditor_read_only ON journal_headers;

-- ---------------------------------------------------------------------------
-- 3) Стандартна tenant-scope политика (uuid tenant_id)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account_plan',
    'accounting_rules',
    'activity_logs',
    'ai_inbox',
    'approvals',
    'audit_log',
    'bank_accounts',
    'bank_links',
    'budgets',
    'company_divisions',
    'contracts',
    'contract_versions',
    'contract_parties',
    'counterparties',
    'deals',
    'depreciation_runs',
    'documents',
    'employees',
    'expenses',
    'fiscal_years',
    'fixed_assets',
    'inventory_items',
    'inventory_movements',
    'invoices',
    'leave_requests',
    'payment_orders',
    'payroll_runs',
    'projects',
    'purchase_invoices',
    'tasks',
    'time_entries',
    'vat_journals',
    'webhooks',
    'work_schedules'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_scope ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_tenant_scope ON %I FOR ALL USING (tenant_id = current_tenant_id() AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id() AND current_membership_active());',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Таблици с text('tenant_id')
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tax_declarations',
    'financial_reports'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_scope ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_tenant_scope ON %I FOR ALL USING (tenant_id = current_tenant_id()::text AND current_membership_active()) WITH CHECK (tenant_id = current_tenant_id()::text AND current_membership_active());',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Специални случаи
-- ---------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_tenant_scope ON tenants;
CREATE POLICY tenants_tenant_scope ON tenants
  FOR ALL
  USING (id = current_tenant_id() AND current_membership_active())
  WITH CHECK (id = current_tenant_id() AND current_membership_active());

-- users: Clerk bootstrap by clerk_id, otherwise own active membership row.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_scope ON users;
CREATE POLICY users_tenant_scope ON users
  FOR ALL
  USING (
    (clerk_id = current_clerk_id() AND current_clerk_id() IS NOT NULL)
    OR (
      tenant_id = current_tenant_id()
      AND id = current_user_id()
      AND COALESCE(is_active, true)
    )
  )
  WITH CHECK (
    (clerk_id = current_clerk_id() AND current_clerk_id() IS NOT NULL)
    OR (
      tenant_id = current_tenant_id()
      AND id = current_user_id()
      AND COALESCE(is_active, true)
    )
  );

ALTER TABLE nap_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nap_integrations_tenant_scope ON nap_integrations;
CREATE POLICY nap_integrations_tenant_scope ON nap_integrations
  FOR ALL
  USING (organization_id = current_tenant_id() AND current_membership_active())
  WITH CHECK (organization_id = current_tenant_id() AND current_membership_active());

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_tenant_scope ON roles;
CREATE POLICY roles_tenant_scope ON roles
  FOR ALL
  USING (
    current_membership_active()
    AND (tenant_id IS NULL OR tenant_id = current_tenant_id())
  )
  WITH CHECK (
    current_membership_active()
    AND (tenant_id IS NULL OR tenant_id = current_tenant_id())
  );

-- ---------------------------------------------------------------------------
-- 6) Child таблици без собствена tenant_id колона — достъп през родителя
-- ---------------------------------------------------------------------------
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_lines_tenant_scope ON journal_lines;
CREATE POLICY journal_lines_tenant_scope ON journal_lines
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM journal_headers h WHERE h.id = journal_lines.journal_id AND h.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM journal_headers h WHERE h.id = journal_lines.journal_id AND h.tenant_id = current_tenant_id()));

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_lines_tenant_scope ON invoice_lines;
CREATE POLICY invoice_lines_tenant_scope ON invoice_lines
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.tenant_id = current_tenant_id()));

ALTER TABLE purchase_invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_invoice_lines_tenant_scope ON purchase_invoice_lines;
CREATE POLICY purchase_invoice_lines_tenant_scope ON purchase_invoice_lines
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM purchase_invoices p WHERE p.id = purchase_invoice_lines.invoice_id AND p.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM purchase_invoices p WHERE p.id = purchase_invoice_lines.invoice_id AND p.tenant_id = current_tenant_id()));

ALTER TABLE payroll_slip_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_slip_items_tenant_scope ON payroll_slip_items;
CREATE POLICY payroll_slip_items_tenant_scope ON payroll_slip_items
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM payroll_runs r WHERE r.id = payroll_slip_items.run_id AND r.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM payroll_runs r WHERE r.id = payroll_slip_items.run_id AND r.tenant_id = current_tenant_id()));

ALTER TABLE depreciation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS depreciation_logs_tenant_scope ON depreciation_logs;
CREATE POLICY depreciation_logs_tenant_scope ON depreciation_logs
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM depreciation_runs r WHERE r.id = depreciation_logs.run_id AND r.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM depreciation_runs r WHERE r.id = depreciation_logs.run_id AND r.tenant_id = current_tenant_id()));

ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_periods_tenant_scope ON accounting_periods;
CREATE POLICY accounting_periods_tenant_scope ON accounting_periods
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM fiscal_years f WHERE f.id = accounting_periods.fiscal_year_id AND f.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM fiscal_years f WHERE f.id = accounting_periods.fiscal_year_id AND f.tenant_id = current_tenant_id()));

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_transactions_tenant_scope ON bank_transactions;
CREATE POLICY bank_transactions_tenant_scope ON bank_transactions
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM bank_accounts b WHERE b.id = bank_transactions.account_id AND b.tenant_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM bank_accounts b WHERE b.id = bank_transactions.account_id AND b.tenant_id = current_tenant_id()));

ALTER TABLE nap_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nap_access_log_tenant_scope ON nap_access_log;
CREATE POLICY nap_access_log_tenant_scope ON nap_access_log
  FOR ALL
  USING (current_membership_active() AND EXISTS (SELECT 1 FROM nap_integrations n WHERE n.id = nap_access_log.integration_id AND n.organization_id = current_tenant_id()))
  WITH CHECK (current_membership_active() AND EXISTS (SELECT 1 FROM nap_integrations n WHERE n.id = nap_access_log.integration_id AND n.organization_id = current_tenant_id()));

-- ---------------------------------------------------------------------------
-- 7) Таблици без tenant колона — НЕ са покрити (по дизайн):
--    waitlist, exchange_rates, e_invoice_status (чака real FK към invoices),
--    permissions, role_permissions (глобални RBAC метаданни), memories.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 8) FORCE ROW LEVEL SECURITY remains OFF.
--    Application traffic uses a non-owner NOBYPASSRLS role (see roles.sql).
--    Enabling FORCE would only compensate for connecting as table owner.
-- ---------------------------------------------------------------------------
-- ALTER TABLE journal_headers FORCE ROW LEVEL SECURITY;
-- ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
-- ALTER TABLE employees FORCE ROW LEVEL SECURITY;
