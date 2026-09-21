import { vatLineAmounts, vatPeriodBounds } from '@/lib/tax/vat-period';
import { isUuid, parseUuidParam } from '@/lib/utils/ids';
import { assertBalancedJournal } from '@/lib/accounting/auto-postings';

describe('vat period helpers', () => {
  it('builds inclusive month bounds', () => {
    expect(vatPeriodBounds(2026, 9)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('prefers net/vat/total amount fields', () => {
    expect(vatLineAmounts({
      netAmount: '100',
      vatAmount: '20',
      totalAmount: '120',
    })).toEqual({ net: 100, vat: 20, gross: 120 });
  });
});

describe('uuid helpers', () => {
  it('accepts canonical uuids', () => {
    expect(isUuid('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(parseUuidParam('not-a-uuid')).toBeNull();
  });
});

describe('journal balance', () => {
  it('accepts balanced debit/credit lines', () => {
    expect(() => assertBalancedJournal([
      { entryType: 'debit', amount: 120 },
      { entryType: 'credit', amount: 100 },
      { entryType: 'credit', amount: 20 },
    ])).not.toThrow();
  });

  it('rejects unbalanced journals', () => {
    expect(() => assertBalancedJournal([
      { entryType: 'debit', amount: 1000 },
    ])).toThrow('Unbalanced journal');
  });
});
