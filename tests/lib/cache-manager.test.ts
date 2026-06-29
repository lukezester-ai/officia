import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedData, invalidateCache, invalidateCachePattern } from '@/lib/cache/cache-manager';

describe('cache-manager (in-memory fallback)', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_URL', '');
    vi.stubEnv('UPSTASH_REDIS_TOKEN', '');
  });

  it('calls fetcher once and returns cached value on second read', async () => {
    const fetcher = vi.fn(async () => ({ total: 42 }));
    const key = `test:cache:${Date.now()}`;

    const first = await getCachedData(key, fetcher, 60);
    const second = await getCachedData(key, fetcher, 60);

    expect(first).toEqual({ total: 42 });
    expect(second).toEqual({ total: 42 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidateCache forces a refetch', async () => {
    const fetcher = vi.fn(async () => Math.random());
    const key = `test:invalidate:${Date.now()}`;

    const first = await getCachedData(key, fetcher, 60);
    await invalidateCache(key);
    const second = await getCachedData(key, fetcher, 60);

    expect(first).not.toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidateCachePattern removes keys by prefix', async () => {
    const prefix = `test:pattern:${Date.now()}:`;
    const fetcherA = vi.fn(async () => 'a');
    const fetcherB = vi.fn(async () => 'b');

    await getCachedData(`${prefix}a`, fetcherA, 60);
    await getCachedData(`${prefix}b`, fetcherB, 60);
    await invalidateCachePattern(prefix);

    await getCachedData(`${prefix}a`, fetcherA, 60);
    await getCachedData(`${prefix}b`, fetcherB, 60);

    expect(fetcherA).toHaveBeenCalledTimes(2);
    expect(fetcherB).toHaveBeenCalledTimes(2);
  });
});
