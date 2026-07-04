-- 2024-02-01-add-purchase-invoices.sql
-- Migration: creates purchase_invoices and purchase_invoice_lines tables

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  issue_date TEXT,
  due_date TEXT,
  supplier_name TEXT NOT NULL,
  supplier_eik TEXT,
  supplier_vat TEXT,
  supplier_address TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  net_amount TEXT NOT NULL DEFAULT '0',
  vat_amount TEXT NOT NULL DEFAULT '0',
  total_amount TEXT NOT NULL DEFAULT '0',
  vat_posted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '1',
  unit_price TEXT NOT NULL DEFAULT '0',
  vat_rate INTEGER NOT NULL DEFAULT 20,
  line_net TEXT NOT NULL DEFAULT '0',
  line_vat TEXT NOT NULL DEFAULT '0',
  line_total TEXT NOT NULL DEFAULT '0',
  line_order INTEGER NOT NULL DEFAULT 0
);
