import { mapBookedTransaction, pickBalance } from '@/lib/banking/gocardless-map';

describe('gocardless mapping', () => {
  it('prefers the available balance', () => {
    expect(pickBalance([
      { balanceType: 'closingBooked', balanceAmount: { amount: '10', currency: 'EUR' } },
      { balanceType: 'interimAvailable', balanceAmount: { amount: '8.5', currency: 'EUR' } },
    ])).toEqual({ amount: '8.50', currency: 'EUR' });
  });

  it('maps an incoming payment to the debtor', () => {
    const row = mapBookedTransaction({
      transactionId: 'tx-1',
      bookingDate: '2026-09-01',
      transactionAmount: { amount: '12.5', currency: 'EUR' },
      remittanceInformationUnstructured: 'Фактура 1',
      debtorName: 'Клиент',
      debtorAccount: { iban: 'BG80BNBG96611020345678' },
    });
    expect(row).toMatchObject({
      transactionId: 'tx-1',
      amount: '12.50',
      counterpartyName: 'Клиент',
      counterpartyIban: 'BG80BNBG96611020345678',
      description: 'Фактура 1',
    });
  });

  it('maps an outgoing payment to the creditor', () => {
    const row = mapBookedTransaction({
      internalTransactionId: 'tx-2',
      bookingDate: '2026-09-02',
      transactionAmount: { amount: '-4', currency: 'EUR' },
      creditorName: 'НАП',
      creditorAccount: { iban: 'BG80BNBG96611020345678' },
    });
    expect(row?.amount).toBe('-4.00');
    expect(row?.counterpartyName).toBe('НАП');
  });

  it('skips a row without an id', () => {
    expect(mapBookedTransaction({
      bookingDate: '2026-09-01',
      transactionAmount: { amount: '1', currency: 'EUR' },
    })).toBeNull();
  });
});
