-- Barcode support for warehouse scanners (USB/BT/camera)
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode
  ON inventory_items (tenant_id, barcode)
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku
  ON inventory_items (tenant_id, sku);
