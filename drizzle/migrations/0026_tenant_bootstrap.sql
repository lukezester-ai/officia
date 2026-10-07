-- Allow the first company insert during Google sign-up, before a tenant GUC exists.
DROP POLICY IF EXISTS tenants_bootstrap_insert ON tenants;
CREATE POLICY tenants_bootstrap_insert ON tenants
  FOR INSERT
  WITH CHECK (
    current_clerk_id() IS NOT NULL
    AND current_tenant_id() IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM users WHERE users.clerk_id = current_clerk_id()
    )
  );
