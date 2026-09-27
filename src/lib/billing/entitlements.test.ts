import { daysLeft, isAccessOpen, rulesFor, trialEndsFrom } from '@/lib/billing/plan-rules';

describe('plan access', () => {
  const start = new Date('2026-09-01T00:00:00.000Z');

  it('keeps a starter open for 14 days and closed after that', () => {
    const trialEndsAt = trialEndsFrom(start);
    expect(isAccessOpen({
      plan: 'starter',
      subscriptionStatus: 'trialing',
      trialEndsAt,
      now: new Date('2026-09-14T00:00:00.000Z'),
    })).toBe(true);
    expect(isAccessOpen({
      plan: 'starter',
      subscriptionStatus: 'trialing',
      trialEndsAt,
      now: new Date('2026-09-15T00:00:00.000Z'),
    })).toBe(false);
  });

  it('opens a paid plan only after the subscription is active', () => {
    expect(isAccessOpen({
      plan: 'business',
      subscriptionStatus: 'active',
      trialEndsAt: null,
      now: start,
    })).toBe(true);
    expect(isAccessOpen({
      plan: 'pro',
      subscriptionStatus: 'trialing',
      trialEndsAt: null,
      now: start,
    })).toBe(false);
  });

  it('locks payroll, HR, AI and the VAT file on starter', () => {
    expect(rulesFor('starter').modules).toEqual({
      payroll: false,
      hr: false,
      ai: false,
      vatZip: false,
    });
    expect(rulesFor('starter').limits).toEqual({
      users: 1,
      invoicesPerMonth: 50,
      employees: 0,
    });
    expect(rulesFor('business').limits.users).toBe(3);
    expect(rulesFor('business').limits.employees).toBe(10);
    expect(rulesFor('pro').limits.users).toBe(10);
    expect(rulesFor('pro').limits.employees).toBeNull();
    expect(rulesFor('accounting_firm').limits.users).toBeNull();
  });

  it('counts whole days left in the trial', () => {
    const trialEndsAt = new Date('2026-09-15T00:00:00.000Z');
    expect(daysLeft(trialEndsAt, new Date('2026-09-13T12:00:00.000Z'))).toBe(2);
    expect(daysLeft(trialEndsAt, new Date('2026-09-16T00:00:00.000Z'))).toBe(0);
  });
});
