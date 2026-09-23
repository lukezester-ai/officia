export function getAppDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

export function getMigrateDatabaseUrl(): string {
  const migrate = process.env.DATABASE_MIGRATE_URL?.trim();
  const app = process.env.DATABASE_URL?.trim();
  const productionRuntime =
    process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';

  if (productionRuntime) {
    if (!migrate) {
      throw new Error('DATABASE_MIGRATE_URL is required in production');
    }
    if (app && migrate === app) {
      throw new Error('DATABASE_MIGRATE_URL must differ from DATABASE_URL');
    }
    return migrate;
  }

  return migrate || getAppDatabaseUrl();
}
