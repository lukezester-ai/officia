CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_ai_status ON invoices (tenant_id, ai_status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_issue_date ON invoices (tenant_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses (tenant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_date ON purchase_invoices (tenant_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant_status ON approvals (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_ai_status ON documents (tenant_id, ai_status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_review ON bank_transactions (account_id, review_required);
