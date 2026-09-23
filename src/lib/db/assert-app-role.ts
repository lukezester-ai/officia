type SqlClient = ReturnType<typeof import('postgres')>;

export async function assertApplicationDbRole(client: SqlClient): Promise<void> {
  if (process.env.OFFICIA_SKIP_APP_ROLE_ASSERT === '1') return;
  const enforce =
    process.env.OFFICIA_ENFORCE_APP_ROLE === '1' ||
    (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build');
  if (!enforce) return;

  const [role] = await client`
    SELECT current_user AS name, r.rolsuper, r.rolbypassrls
    FROM pg_roles r
    WHERE r.rolname = current_user
  `;

  if (!role) {
    throw new Error('DATABASE_URL role could not be resolved');
  }
  if (role.rolsuper) {
    throw new Error('DATABASE_URL must not be a superuser');
  }
  if (role.rolbypassrls) {
    throw new Error('DATABASE_URL must be NOBYPASSRLS');
  }

  const owned = await client`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_roles r ON r.oid = c.relowner
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND r.rolname = current_user
    LIMIT 1
  `;

  if (owned.length > 0) {
    throw new Error('DATABASE_URL role must not own application tables');
  }
}
