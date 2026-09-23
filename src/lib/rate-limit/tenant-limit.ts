import { NextResponse } from 'next/server';
import {
  consumeTenantRateLimit,
  type RateLimitDecision,
  RATE_LIMIT_WINDOW_SEC,
} from './consume';

export {
  AI_CHAT_ROUTE_LIMIT,
  DEFAULT_ROUTE_LIMIT,
  RATE_LIMIT_WINDOW_SEC,
  consumeTenantRateLimit,
  rateLimitKey,
} from './consume';

export function rateLimitResponse(decision: Extract<RateLimitDecision, { ok: false }>, requestId?: string): NextResponse {
  if (decision.reason === 'missing_tenant') {
    return NextResponse.json({ error: 'Forbidden', requestId }, { status: 403 });
  }
  if (decision.reason === 'over_limit') {
    return NextResponse.json(
      { error: 'Too many requests', requestId },
      { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW_SEC) } },
    );
  }
  return NextResponse.json({ error: 'Rate limiter unavailable', requestId }, { status: 503 });
}

export async function enforceTenantRateLimit(opts: {
  tenantId?: string | null;
  route: string;
  limit?: number;
  requestId?: string;
  client?: Parameters<typeof consumeTenantRateLimit>[0]['client'];
}): Promise<NextResponse | null> {
  const decision = await consumeTenantRateLimit(opts);
  if (decision.ok) return null;
  return rateLimitResponse(decision, opts.requestId);
}
