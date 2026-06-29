import { getRedis } from '@/lib/cache/upstash';

type MemoryEntry = { value: unknown; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setInMemory(key: string, value: unknown, ttlSeconds: number) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const data = await fetcher();
    await redis.set(key, data, { ex: ttlSeconds });
    return data;
  }

  const cached = getFromMemory<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  setInMemory(key, data, ttlSeconds);
  return data;
}

export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
  }
  memoryCache.delete(key);
}

export async function invalidateCachePattern(prefix: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
