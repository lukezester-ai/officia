ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan text DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
