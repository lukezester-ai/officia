-- Активиране на Row-Level Security (RLS) за ключовите таблици
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_rules ENABLE ROW LEVEL SECURITY;

-- Функции за извличане на контекста (ако не се ползват директно JWT claims на Supabase)
-- CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
--   SELECT current_setting('app.current_tenant_id', true)::uuid;
-- $$ LANGUAGE sql STABLE;

-- Политика: Само собственик/одитор да вижда салда
CREATE POLICY "Only owner or auditor can see journal entries" ON journal_entries
  FOR ALL
  USING (tenant_id = current_tenant_id() OR current_user_role() IN ('owner', 'auditor'));

-- Политика: Счетоводителите виждат само техните клиенти (ако е мулти-клиент)
CREATE POLICY "Accountants see only their assigned clients" ON journal_entries
  FOR ALL
  USING (tenant_id = current_tenant_id() AND (posted_by = current_user_id() OR current_user_role() = 'senior_accountant'));
