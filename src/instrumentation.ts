export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { getClient } = await import('./lib/db/db');
  const { assertApplicationDbRole } = await import('./lib/db/assert-app-role');
  const { assertRedisConfigured } = await import('./lib/rate-limit/redis');
  await assertApplicationDbRole(getClient());
  await assertRedisConfigured();
}
