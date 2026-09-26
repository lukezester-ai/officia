import { isDealStage, parseDealAmount } from '@/lib/crm/deals';

describe('deal stages', () => {
  it('accepts the sales stages', () => {
    expect(isDealStage('lead')).toBe(true);
    expect(isDealStage('won')).toBe(true);
    expect(isDealStage('invoice')).toBe(false);
  });

  it('keeps amounts to two decimal places', () => {
    expect(parseDealAmount('1200,5')).toBe(1200.5);
    expect(parseDealAmount('10.555')).toBeNull();
    expect(parseDealAmount('-1')).toBeNull();
  });
});
