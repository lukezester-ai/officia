import { isPublicApiPath } from '@/lib/auth/public-api';

describe('public API allow-list', () => {
  it('allows only webhook, health, cron, and AI webhook paths', () => {
    expect(isPublicApiPath('/api/health')).toBe(true);
    expect(isPublicApiPath('/api/webhooks/stripe')).toBe(true);
    expect(isPublicApiPath('/api/cron/deadlines')).toBe(true);
    expect(isPublicApiPath('/api/stripe/checkout')).toBe(false);
    expect(isPublicApiPath('/api/ai/chat')).toBe(false);
    expect(isPublicApiPath('/api/healthz')).toBe(false);
  });
});
