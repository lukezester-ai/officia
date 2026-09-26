export interface GcAmount {
  amount?: string;
  currency?: string;
}

export interface GcTransaction {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  transactionAmount?: GcAmount;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  debtorName?: string;
  creditorName?: string;
  debtorAccount?: { iban?: string };
  creditorAccount?: { iban?: string };
}

export interface GcBalance {
  balanceType?: string;
  balanceAmount?: GcAmount;
}

export interface MappedBankTransaction {
  transactionId: string;
  amount: string;
  currency: string;
  date: Date;
  description: string;
  counterpartyName: string;
  counterpartyIban: string;
}

function asMoney(amount?: string, currency?: string) {
  const value = amount == null ? Number.NaN : Number(amount);
  if (!Number.isFinite(value)) return null;
  return { amount: value.toFixed(2), currency: currency || 'EUR' };
}

export function pickBalance(balances: GcBalance[]): { amount: string; currency: string } | null {
  const preferred = ['interimAvailable', 'expected', 'closingBooked'];
  for (const type of preferred) {
    const found = balances.find((row) => row.balanceType === type);
    const money = asMoney(found?.balanceAmount?.amount, found?.balanceAmount?.currency);
    if (money) return money;
  }
  for (const row of balances) {
    const money = asMoney(row.balanceAmount?.amount, row.balanceAmount?.currency);
    if (money) return money;
  }
  return null;
}

export function mapBookedTransaction(tx: GcTransaction): MappedBankTransaction | null {
  const rawAmount = tx.transactionAmount?.amount;
  const amount = rawAmount == null ? Number.NaN : Number(rawAmount);
  if (!Number.isFinite(amount)) return null;

  const date = tx.bookingDate ? new Date(tx.bookingDate) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  const transactionId = (tx.transactionId || tx.internalTransactionId || '').trim();
  if (!transactionId) return null;

  const incoming = amount >= 0;
  const description = (tx.remittanceInformationUnstructured
    || tx.remittanceInformationUnstructuredArray?.join(' ')
    || '').trim();

  return {
    transactionId,
    amount: amount.toFixed(2),
    currency: tx.transactionAmount?.currency || 'EUR',
    date,
    description,
    counterpartyName: (incoming ? tx.debtorName : tx.creditorName) || '',
    counterpartyIban: (incoming ? tx.debtorAccount?.iban : tx.creditorAccount?.iban) || '',
  };
}
