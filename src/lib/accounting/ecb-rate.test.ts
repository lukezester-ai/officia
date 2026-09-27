import { ecbRateFromFrankfurter } from '@/lib/accounting/bnb-client';
import { monthEndDate } from '@/lib/accounting/revaluation-engine';

describe('ECB rate parsing', () => {
  it('reads the euro rate from a Frankfurter payload', () => {
    expect(ecbRateFromFrankfurter({
      date: '2026-08-31',
      rates: { EUR: 0.92 },
    }, 'USD', '2026-08-31')).toEqual({
      currencyCode: 'USD',
      rate: 0.92,
      date: '2026-08-31',
    });
  });

  it('refuses a payload without a rate', () => {
    expect(() => ecbRateFromFrankfurter({ rates: {} }, 'GBP', '2026-08-31')).toThrow(/Няма курс/);
  });

  it('treats euro as one euro', () => {
    expect(ecbRateFromFrankfurter(null, 'EUR', '2026-08-31').rate).toBe(1);
  });

  it('uses the last calendar day of the month', () => {
    expect(monthEndDate('2026', '02')).toBe('2026-02-28');
    expect(monthEndDate('2026', '8')).toBe('2026-08-31');
  });
});
