import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '@/lib/cache/upstash';

type RateLimitResult = {
  success: boolean;
  reset: number;
  remaining?: number;
};

const memoryBuckets = new Map<string, { count: number; reset: number }>();

const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const key = `${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: true,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

async function checkMemoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = memoryBuckets.get(identifier);

  if (!bucket || now > bucket.reset) {
    memoryBuckets.set(identifier, { count: 1, reset: now + windowMs });
    return { success: true, reset: now + windowMs, remaining: limit - 1 };
  }

  bucket.count += 1;
  memoryBuckets.set(identifier, bucket);

  if (bucket.count > limit) {
    return { success: false, reset: bucket.reset, remaining: 0 };
  }

  return { success: true, reset: bucket.reset, remaining: limit - bucket.count };
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60_000,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowMs);

  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      reset: result.reset,
      remaining: result.remaining,
    };
  }

  return checkMemoryRateLimit(identifier, limit, windowMs);
}

export async function withRateLimit(
  identifier: string,
  handler: () => Promise<Response>,
  limit: number = 10,
  windowMs: number = 60_000,
): Promise<Response> {
  const { success, reset } = await checkRateLimit(identifier, limit, windowMs);

  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'X-RateLimit-Reset': reset.toString() },
    });
  }

  return handler();
}
