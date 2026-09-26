import { vatLineAmounts, vatPeriodBounds } from '@/lib/tax/vat-period';
import { isUuid, parseUuidParam } from '@/lib/utils/ids';
import { assertBalancedJournal } from '@/lib/accounting/auto-postings';
import { chooseInvoiceNumber } from '@/lib/accounting/invoice-number';
import { parseManualJournalLines } from '@/lib/accounting/manual-journal';

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

describe('invoice numbers', () => {
  it('keeps a free requested number', () => {
    expect(chooseInvoiceNumber('0000000007', ['0000000001'])).toBe('0000000007');
  });

  it('allocates the next number when the default is taken', () => {
    expect(chooseInvoiceNumber('0000000001', ['0000000001', '0000000004'])).toBe('0000000005');
  });
});

describe('manual journal lines', () => {
  it('splits debit and credit rows', () => {
    expect(parseManualJournalLines([
      { account: '411', description: 'клиент', debit: '120', credit: '' },
      { account: '701', description: 'приход', debit: '', credit: '100' },
      { account: '4532', description: 'ддс', debit: '0', credit: '20' },
    ])).toEqual([
      { account: '411', description: 'клиент', entryType: 'debit', amount: 120 },
      { account: '701', description: 'приход', entryType: 'credit', amount: 100 },
      { account: '4532', description: 'ддс', entryType: 'credit', amount: 20 },
    ]);
  });

  it('rejects a row with both sides filled', () => {
    expect(() => parseManualJournalLines([
      { account: '411', description: '', debit: '10', credit: '10' },
    ])).toThrow('или дебит, или кредит');
  });
});
