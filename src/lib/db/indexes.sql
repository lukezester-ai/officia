-- Критични индекси за бързина
CREATE INDEX CONCURRENTLY idx_journal_headers_tenant_date ON journal_headers(tenant_id, entry_date);
CREATE INDEX CONCURRENTLY idx_journal_headers_tenant_status ON journal_headers(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_journal_lines_journal ON journal_lines(journal_id);
CREATE INDEX CONCURRENTLY idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX CONCURRENTLY idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_audit_log_tenant_created ON audit_log(tenant_id, created_at);

-- Партициониране за големи таблици (journal_lines)
-- Внимание: Drizzle ORM не поддържа автоматично създаване на партиции, 
-- затова този SQL се изпълнява ръчно или през къстъм миграция.
CREATE TABLE journal_lines_2026 PARTITION OF journal_lines
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
