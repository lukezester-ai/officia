-- Активиране на Row Level Security за всички tenant-owned таблици
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "counterparties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_declarations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_invoices" ENABLE ROW LEVEL SECURITY;

-- Създаване на базова политика за tenant isolation за тези таблици
-- Използваме current_setting('app.current_tenant_id') или auth.jwt() в зависимост от архитектурата.
-- Тук дефинираме шаблон за всяка таблица:

CREATE POLICY "tenant_isolation_invoices" ON "invoices"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_employees" ON "employees"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_expenses" ON "expenses"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_bank_transactions" ON "bank_transactions"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_documents" ON "documents"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_counterparties" ON "counterparties"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_payroll_runs" ON "payroll_runs"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_inventory_levels" ON "inventory_levels"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_tax_declarations" ON "tax_declarations"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_projects" ON "projects"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_tasks" ON "tasks"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "tenant_isolation_purchase_invoices" ON "purchase_invoices"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
