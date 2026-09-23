import { consumeTenantRateLimit, rateLimitKey } from '@/lib/rate-limit/consume';

describe('Redis rate-limit contract', () => {
  it('scopes keys by tenant and route', () => {
    expect(rateLimitKey('tenant-a', 'ai:chat')).toBe('officia:rl:v1:tenant-a:ai:chat');
    expect(rateLimitKey('tenant-a', 'ai:chat')).not.toEqual(rateLimitKey('tenant-b', 'ai:chat'));
    expect(rateLimitKey('tenant-a', 'ai:chat')).not.toEqual(rateLimitKey('tenant-a', 'bank:match'));
  });

  it('denies missing tenant without talking to Redis', async () => {
    const decision = await consumeTenantRateLimit({ tenantId: '', route: 'ai:chat' });
    expect(decision).toEqual({ ok: false, reason: 'missing_tenant' });
  });
});
