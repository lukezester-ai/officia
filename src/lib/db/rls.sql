-- Активиране на RLS (Row-Level Security)
ALTER TABLE journal_headers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Политика: Само собственика и senior счетоводителите могат да постват
CREATE POLICY senior_can_post ON journal_headers
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND current_user_role() IN ('owner', 'senior_accountant')
  )
  WITH CHECK (NEW.status = 'posted');

-- Политика: Junior счетоводителите виждат само чернови
CREATE POLICY junior_see_drafts_only ON journal_headers
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND (
      current_user_role() != 'junior_accountant'
      OR status = 'draft'
    )
  );

-- Политика: Одиторите виждат всичко, но не променят
CREATE POLICY auditor_read_only ON journal_headers
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND current_user_role() = 'auditor'
  );
