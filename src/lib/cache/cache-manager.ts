// В реална среда: import { Redis } from '@upstash/redis';

// Mock за да работи TypeScript без реалния пакет
const Redis = class {
  constructor(config: any) {}
  async get(key: string): Promise<any> { return null; }
  async set(key: string, value: any, options?: any): Promise<void> {}
  async del(key: string): Promise<void> {}
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

export async function getCachedData<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return cached as T; // Връщаме от паметта (под 50ms)
  }

  // Ако го няма, дърпаме от базата данни
  const data = await fetcher();
  
  // Кешираме резултата с време на живот (TTL)
  await redis.set(key, data, { ex: ttlSeconds });
  
  return data;
}

export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}
