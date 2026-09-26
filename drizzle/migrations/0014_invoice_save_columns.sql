ALTER TABLE invoices ADD COLUMN IF NOT EXISTS einvoice_status text DEFAULT 'pending';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS error_reason text;
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS sklad_item_id uuid;
