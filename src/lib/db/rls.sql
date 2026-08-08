-- ============================================================================
-- Officia — Row Level Security (RLS): пълни, идемпотентни политики
-- ============================================================================
-- Scope: всички tenant-owned таблици (uuid('tenant_id') и text('tenant_id')),
-- включително invoices и employees, които досега бяха коментирани.
--
-- ⚠️ Активиране — МИНИМАЛНИ ИЗИСКВАНИЯ (иначе приложението "ослепява"):
--   1. Приложението трябва да задава сесийния контекст при ВСЯКА заявка:
--        SELECT set_config('app.current_tenant_id', '<tenant_uuid>', true);
--        SELECT set_config('app.current_user_id',    '<user_uuid>',  true);
--        SELECT set_config('app.current_user_role',  '<role>',       true);
--      Готовият хелпер е в src/lib/db/rls_utils.ts::setRLSContext().
--   2. Потребителят от DATABASE_URL НЕ трябва да е собственик на таблиците,
--      ИЛИ трябва да се добави FORCE ROW LEVEL SECURITY (има пример в края).
--      Без това собственикът заобикаля RLS (PostgreSQL behavior).
--   3. Ако контекстът не е зададен, current_tenant_id() връща NULL и всички
--      политики отказват достъп (fail-closed) — това е желаното поведение.
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

-- ---------------------------------------------------------------------------
-- 2) journal_headers — базови + ролеви политики
-- ---------------------------------------------------------------------------
ALTER TABLE journal_headers ENABLE ROW LEVEL SECURITY;

-- SELECT: всеки от фирмата; junior счетоводителите виждат само чернови
DROP POLICY IF EXISTS jh_tenant_select ON journal_headers;
CREATE POLICY jh_tenant_select ON journal_headers
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (current_user_role() <> 'junior_accountant' OR status = 'draft')
  );

-- INSERT: само счетоводен персонал на фирмата
DROP POLICY IF EXISTS jh_tenant_insert ON journal_headers;
CREATE POLICY jh_tenant_insert ON journal_headers
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'senior_accountant', 'accountant')
  );

-- UPDATE: само собственик и senior счетоводител; постването е ограничено до 'posted'
DROP POLICY IF EXISTS jh_tenant_update ON journal_headers;
CREATE POLICY jh_tenant_update ON journal_headers
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'senior_accountant')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'senior_accountant')
    AND status IN ('draft', 'posted', 'canceled')
  );

-- DELETE: само собственик и senior счетоводител
DROP POLICY IF EXISTS jh_tenant_delete ON journal_headers;
CREATE POLICY jh_tenant_delete ON journal_headers
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('owner', 'senior_accountant')
  );

-- Съвместимост със старите имена на политики (ако съществуват от преди)
DROP POLICY IF EXISTS senior_can_post ON journal_headers;
DROP POLICY IF EXISTS junior_see_drafts_only ON journal_headers;
DROP POLICY IF EXISTS auditor_read_only ON journal_headers;

-- ---------------------------------------------------------------------------
-- 3) Стандартна tenant-scope политика (uuid tenant_id)
--    Използва се за всички таблици с колона tenant_id uuid.
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
    'budgets',
    'company_divisions',
    'contracts',
    'contract_versions',
    'contract_parties',
    'counterparties',
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
    'payroll_runs',
    'projects',
    'tasks',
    'time_entries',
    'vat_journals',
    'webhooks',
    'work_schedules'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_scope ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_tenant_scope ON %I FOR ALL USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());',
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
    'purchase_invoices',
    'tax_declarations',
    'financial_reports'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_scope ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_tenant_scope ON %I FOR ALL USING (tenant_id = current_tenant_id()::text) WITH CHECK (tenant_id = current_tenant_id()::text);',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Специални случаи
-- ---------------------------------------------------------------------------
-- tenants: всеки вижда само своята фирма
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_tenant_scope ON tenants;
CREATE POLICY tenants_tenant_scope ON tenants
  FOR ALL
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- users: член на фирмата ИЛИ самият потребител (за собствен профил)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_scope ON users;
CREATE POLICY users_tenant_scope ON users
  FOR ALL
  USING (tenant_id = current_tenant_id() OR id = current_user_id())
  WITH CHECK (tenant_id = current_tenant_id() OR id = current_user_id());

-- nap_integrations: организацията се идентифицира чрез organization_id
ALTER TABLE nap_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nap_integrations_tenant_scope ON nap_integrations;
CREATE POLICY nap_integrations_tenant_scope ON nap_integrations
  FOR ALL
  USING (organization_id = current_tenant_id())
  WITH CHECK (organization_id = current_tenant_id());

-- rbac roles: системните роли (tenant_id IS NULL) са видими, тeнa-специфичните са скапани
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_tenant_scope ON roles;
CREATE POLICY roles_tenant_scope ON roles
  FOR ALL
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = current_tenant_id());

-- ---------------------------------------------------------------------------
-- 6) Child таблици без собствена tenant_id колона — достъп през родителя
-- ---------------------------------------------------------------------------
-- journal_lines -> journal_headers
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journal_lines_tenant_scope ON journal_lines;
CREATE POLICY journal_lines_tenant_scope ON journal_lines
  FOR ALL
  USING (EXISTS (SELECT 1 FROM journal_headers h WHERE h.id = journal_lines.journal_id AND h.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM journal_headers h WHERE h.id = journal_lines.journal_id AND h.tenant_id = current_tenant_id()));

-- invoice_lines -> invoices
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_lines_tenant_scope ON invoice_lines;
CREATE POLICY invoice_lines_tenant_scope ON invoice_lines
  FOR ALL
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.tenant_id = current_tenant_id()));

-- purchase_invoice_lines -> purchase_invoices
ALTER TABLE purchase_invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_invoice_lines_tenant_scope ON purchase_invoice_lines;
CREATE POLICY purchase_invoice_lines_tenant_scope ON purchase_invoice_lines
  FOR ALL
  USING (EXISTS (SELECT 1 FROM purchase_invoices p WHERE p.id = purchase_invoice_lines.invoice_id AND p.tenant_id = current_tenant_id()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_invoices p WHERE p.id = purchase_invoice_lines.invoice_id AND p.tenant_id = current_tenant_id()::text));

-- payroll_slip_items -> payroll_runs
ALTER TABLE payroll_slip_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_slip_items_tenant_scope ON payroll_slip_items;
CREATE POLICY payroll_slip_items_tenant_scope ON payroll_slip_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM payroll_runs r WHERE r.id = payroll_slip_items.run_id AND r.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM payroll_runs r WHERE r.id = payroll_slip_items.run_id AND r.tenant_id = current_tenant_id()));

-- depreciation_logs -> depreciation_runs
ALTER TABLE depreciation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS depreciation_logs_tenant_scope ON depreciation_logs;
CREATE POLICY depreciation_logs_tenant_scope ON depreciation_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM depreciation_runs r WHERE r.id = depreciation_logs.run_id AND r.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM depreciation_runs r WHERE r.id = depreciation_logs.run_id AND r.tenant_id = current_tenant_id()));

-- accounting_periods -> fiscal_years
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_periods_tenant_scope ON accounting_periods;
CREATE POLICY accounting_periods_tenant_scope ON accounting_periods
  FOR ALL
  USING (EXISTS (SELECT 1 FROM fiscal_years f WHERE f.id = accounting_periods.fiscal_year_id AND f.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM fiscal_years f WHERE f.id = accounting_periods.fiscal_year_id AND f.tenant_id = current_tenant_id()));

-- bank_transactions -> bank_accounts
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_transactions_tenant_scope ON bank_transactions;
CREATE POLICY bank_transactions_tenant_scope ON bank_transactions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM bank_accounts b WHERE b.id = bank_transactions.account_id AND b.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM bank_accounts b WHERE b.id = bank_transactions.account_id AND b.tenant_id = current_tenant_id()));

-- nap_access_log -> nap_integrations
ALTER TABLE nap_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nap_access_log_tenant_scope ON nap_access_log;
CREATE POLICY nap_access_log_tenant_scope ON nap_access_log
  FOR ALL
  USING (EXISTS (SELECT 1 FROM nap_integrations n WHERE n.id = nap_access_log.integration_id AND n.organization_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM nap_integrations n WHERE n.id = nap_access_log.integration_id AND n.organization_id = current_tenant_id()));

-- ---------------------------------------------------------------------------
-- 7) Таблици без tenant колона — НЕ са покрити (по дизайн):
--    waitlist, exchange_rates, e_invoice_status (чака real FK към invoices),
--    permissions, role_permissions (глобални RBAC метаданни), memories.
--    Ако някоя от тях съдържа данни на потребител, трябва да получи
--    tenant_id/филтър и политика преди да бъде включена в RLS.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 8) Опционално: принудително RLS дори за собственика на таблицата.
--    Включва се СЛЕД като приложението започне да задава сесийния контекст,
--    иначе всички заявки ще върнат 0 реда.
-- ---------------------------------------------------------------------------
-- ALTER TABLE journal_headers FORCE ROW LEVEL SECURITY;
-- ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
-- ALTER TABLE employees FORCE ROW LEVEL SECURITY;
