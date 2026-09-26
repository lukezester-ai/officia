import { splitDealAmount } from '@/lib/crm/deal-invoice';
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

  it('turns a won amount into an invoice total with 20% VAT included', () => {
    expect(splitDealAmount('1200.00')).toEqual({ net: '1000.00', vat: '200.00', total: '1200.00' });
    expect(splitDealAmount('-1')).toBeNull();
  });
});
