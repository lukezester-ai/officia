import { assertBalancedJournal } from '@/lib/accounting/auto-postings';

describe('Account journal balance', () => {
  it('accepts a balanced posting', () => {
    expect(() => assertBalancedJournal([
      { entryType: 'debit', amount: 1000 },
      { entryType: 'credit', amount: 1000 },
    ])).not.toThrow();
  });

  it('rejects unbalanced journal', () => {
    expect(() => assertBalancedJournal([
      { entryType: 'debit', amount: 1000 },
    ])).toThrow('Unbalanced journal');
  });
});
