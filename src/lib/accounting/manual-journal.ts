import { assertBalancedJournal } from '@/lib/accounting/auto-postings';

export const MANUAL_ACCOUNTS: Record<
  string,
  { name: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }
> = {
  '411': { name: 'Клиенти', type: 'asset' },
  '401': { name: 'Доставчици', type: 'liability' },
  '501': { name: 'Каса в евро', type: 'asset' },
  '503': { name: 'Разплащателна сметка', type: 'asset' },
  '601': { name: 'Разходи за материали', type: 'expense' },
  '602': { name: 'Разходи за външни услуги', type: 'expense' },
  '603': { name: 'Амортизации', type: 'expense' },
  '701': { name: 'Приходи от продажби', type: 'revenue' },
  '4531': { name: 'Начислен ДДС за покупки', type: 'asset' },
  '4532': { name: 'Начислен ДДС за продажби', type: 'liability' },
  '241': { name: 'Амортизация на ДМА', type: 'asset' },
  '304': { name: 'Стоки', type: 'asset' },
  '101': { name: 'Основен капитал', type: 'equity' },
  '151': { name: 'Получени дългосрочни заеми', type: 'liability' },
};

export interface ManualJournalDraftLine {
  account: string;
  description: string;
  debit: string;
  credit: string;
}

export interface ManualJournalPosting {
  account: string;
  description: string;
  entryType: 'debit' | 'credit';
  amount: number;
}

export function parseManualJournalLines(lines: ManualJournalDraftLine[]): ManualJournalPosting[] {
  const postings: ManualJournalPosting[] = [];

  for (const line of lines) {
    const account = line.account.trim();
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    const hasDebit = debit > 0;
    const hasCredit = credit > 0;

    if (!account && !hasDebit && !hasCredit) continue;
    if (!account) throw new Error('Изберете сметка за всеки ред със сума');
    if (!MANUAL_ACCOUNTS[account]) throw new Error(`Непозната сметка ${account}`);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      throw new Error('Невалидна сума');
    }
    if (hasDebit && hasCredit) throw new Error('Редът трябва да е или дебит, или кредит');
    if (!hasDebit && !hasCredit) throw new Error('Въведете сума за всеки избран ред');

    postings.push({
      account,
      description: line.description.trim(),
      entryType: hasDebit ? 'debit' : 'credit',
      amount: Math.round((hasDebit ? debit : credit) * 100) / 100,
    });
  }

  try {
    assertBalancedJournal(postings);
  } catch {
    throw new Error('Дебит и кредит трябва да са равни');
  }

  return postings;
}

export function manualJournalNumber(reference: string, now = Date.now()): string {
  const cleaned = reference.trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 24);
  return cleaned ? `MAN-${cleaned}` : `J-MAN-${now}`;
}
