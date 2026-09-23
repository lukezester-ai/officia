import { createClient } from 'redis';

const INCR_EXPIRE = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return n
`;

type AppRedis = ReturnType<typeof createClient>;

const globalForRedis = globalThis as unknown as {
  officiaRedis: AppRedis | undefined;
  officiaRedisConnecting: Promise<AppRedis> | undefined;
};

function redisUrl(): string | undefined {
  return process.env.REDIS_URL?.trim() || undefined;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';
}

export async function assertRedisConfigured(): Promise<void> {
  if (!isProductionRuntime()) return;
  if (!redisUrl()) {
    throw new Error('REDIS_URL is required in production');
  }
}

export async function getRedis(): Promise<AppRedis> {
  await assertRedisConfigured();
  const url = redisUrl();
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  if (globalForRedis.officiaRedis?.isOpen) {
    return globalForRedis.officiaRedis;
  }
  if (!globalForRedis.officiaRedisConnecting) {
    const client = createClient({ url }) as AppRedis;
    globalForRedis.officiaRedisConnecting = (client.connect() as Promise<unknown>).then(() => {
      globalForRedis.officiaRedis = client;
      return client;
    });
  }
  return globalForRedis.officiaRedisConnecting;
}

export async function incrWithExpire(key: string, windowSec: number, client?: AppRedis): Promise<number> {
  const redis = client ?? (await getRedis());
  const result = await redis.sendCommand([
    'EVAL',
    INCR_EXPIRE,
    '1',
    key,
    String(windowSec),
  ]);
  return Number(result);
}

export async function closeRedisForTests(client?: AppRedis) {
  const target = client ?? globalForRedis.officiaRedis;
  globalForRedis.officiaRedis = undefined;
  globalForRedis.officiaRedisConnecting = undefined;
  if (target?.isOpen) {
    await target.quit().catch(() => target.disconnect());
  }
}
