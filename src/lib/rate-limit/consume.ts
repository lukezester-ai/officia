import { AI_CHAT_ROUTE_LIMIT, DEFAULT_ROUTE_LIMIT, RATE_LIMIT_WINDOW_SEC, rateLimitKey } from './keys';
import { incrWithExpire } from './redis';

export { AI_CHAT_ROUTE_LIMIT, DEFAULT_ROUTE_LIMIT, RATE_LIMIT_WINDOW_SEC, rateLimitKey };

export type RateLimitDecision =
  | { ok: true; count: number; remaining: number }
  | { ok: false; reason: 'missing_tenant' | 'over_limit' | 'unavailable'; count?: number };

export async function consumeTenantRateLimit(opts: {
  tenantId?: string | null;
  route: string;
  limit?: number;
  windowSec?: number;
  client?: Parameters<typeof incrWithExpire>[2];
}): Promise<RateLimitDecision> {
  const tenantId = opts.tenantId?.trim();
  if (!tenantId) {
    return { ok: false, reason: 'missing_tenant' };
  }

  const limit = opts.limit ?? DEFAULT_ROUTE_LIMIT;
  const windowSec = opts.windowSec ?? RATE_LIMIT_WINDOW_SEC;

  try {
    const key = rateLimitKey(tenantId, opts.route);
    const count = await incrWithExpire(key, windowSec, opts.client);
    if (count > limit) {
      return { ok: false, reason: 'over_limit', count };
    }
    return { ok: true, count, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
