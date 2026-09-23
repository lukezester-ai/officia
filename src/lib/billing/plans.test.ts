import { parseCheckoutBilling, parseCheckoutPlan, getServerPriceId, CHECKOUT_PLANS } from '@/lib/billing/plans';
import { getAppBaseUrl } from '@/lib/config/app-url';

describe('checkout plan allow-list', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects unknown plans and billing cycles', () => {
    expect(parseCheckoutPlan('starter')).toBeNull();
    expect(parseCheckoutPlan('enterprise')).toBeNull();
    expect(parseCheckoutBilling('weekly')).toBeNull();
    expect(parseCheckoutPlan('business')).toBe('business');
    expect(parseCheckoutBilling('annual')).toBe('annual');
    expect(CHECKOUT_PLANS).not.toContain('starter');
  });

  it('uses only server-side price environment variables', () => {
    process.env.STRIPE_PRICE_BUSINESS_ANNUAL = 'price_business_year';
    expect(getServerPriceId('business', 'annual')).toBe('price_business_year');
    expect(getServerPriceId('pro', 'monthly')).toBeNull();
  });

  it('requires an allow-listed app URL', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(() => getAppBaseUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
    process.env.NEXT_PUBLIC_APP_URL = 'https://evil.example/phishing';
    expect(getAppBaseUrl()).toBe('https://evil.example');
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    expect(getAppBaseUrl()).toBe('http://localhost:3000');
  });
});
