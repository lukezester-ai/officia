export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  // Do not open Postgres or assert DB roles here. A throw in register() 500s
  // every route including /api/health and the public landing page.
  // Application-role checks run in requireTenant() before tenant queries.
}
