ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nordigen_secret_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nordigen_secret_key text;
