import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '@/lib/api/rate-limit';

describe('rate-limit (in-memory fallback)', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_URL', '');
    vi.stubEnv('UPSTASH_REDIS_TOKEN', '');
  });

  it('allows requests within the limit', async () => {
    const id = `user:${Date.now()}:ok`;

    const first = await checkRateLimit(id, 3, 60_000);
    const second = await checkRateLimit(id, 3, 60_000);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it('blocks requests over the limit', async () => {
    const id = `user:${Date.now()}:block`;

    await checkRateLimit(id, 2, 60_000);
    await checkRateLimit(id, 2, 60_000);
    const third = await checkRateLimit(id, 2, 60_000);

    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
