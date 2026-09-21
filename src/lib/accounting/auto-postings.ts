import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { findOrCreateAccount } from '@/lib/accounting/accounts';

export function assertBalancedJournal(lines: { entryType: string; amount: number }[]) {
  if (lines.length < 2) throw new Error('Unbalanced journal');
  const debit = lines.filter((l) => l.entryType === 'debit').reduce((s, l) => s + Number(l.amount || 0), 0);
  const credit = lines.filter((l) => l.entryType === 'credit').reduce((s, l) => s + Number(l.amount || 0), 0);
  if (Math.abs(debit - credit) > 0.009) throw new Error('Unbalanced journal');
}

interface PostingLine {
  account: string;
  description: string;
  debit: number;
  credit: number;
}

export interface AutoPostingInput {
  type: 'sales_invoice' | 'purchase_invoice' | 'bank_debit' | 'bank_credit' | 'depreciation';
  tenantId: string;
  amount: number;
  vatAmount?: number;
  reference?: string;
  description?: string;
  date?: Date;
  documentId?: string;
}

function buildLines(input: AutoPostingInput): PostingLine[] {
  const vat = input.vatAmount ?? 0;
  const net = input.amount - vat;

  switch (input.type) {
    case 'sales_invoice':
      return [
        { account: '411', description: 'Вземане от клиент', debit: input.amount, credit: 0 },
        { account: '701', description: 'Приход от продажба', debit: 0, credit: net },
        ...(vat > 0 ? [{ account: '4532', description: 'ДДС продажби', debit: 0, credit: vat }] : []),
      ];
    case 'purchase_invoice':
      return [
        { account: '601', description: 'Разход за покупка', debit: net, credit: 0 },
        ...(vat > 0 ? [{ account: '4531', description: 'ДДС покупки', debit: vat, credit: 0 }] : []),
        { account: '401', description: 'Задължение към доставчик', debit: 0, credit: input.amount },
      ];
    case 'bank_debit':
      return [
        { account: '503', description: 'Получено плащане', debit: input.amount, credit: 0 },
        { account: '411', description: 'Погасяване на вземане', debit: 0, credit: input.amount },
      ];
    case 'bank_credit':
      return [
        { account: '401', description: 'Плащане към доставчик', debit: input.amount, credit: 0 },
        { account: '503', description: 'Изходящо плащане', debit: 0, credit: input.amount },
      ];
    case 'depreciation':
      return [
        { account: '603', description: 'Амортизационна квота', debit: input.amount, credit: 0 },
        { account: '241', description: 'Начислена амортизация', debit: 0, credit: input.amount },
      ];
    default:
      return [];
  }
}

export async function createAutoPostings(input: AutoPostingInput): Promise<{ success: boolean; journalId?: string; error?: string }> {
  if (!input.tenantId) {
    return { success: false, error: 'Липсва tenant за автоматично осчетоводяване.' };
  }

  const template = buildLines(input);
  const lines = template
    .filter((line) => line.debit > 0 || line.credit > 0)
    .map((line) => ({
      entryType: line.debit > 0 ? 'debit' : 'credit',
      amount: line.debit > 0 ? line.debit : line.credit,
      account: line.account,
      description: line.description,
    }));

  try {
    assertBalancedJournal(lines);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  const entryDate = input.date ?? new Date();
  const refNum = input.reference ?? `AUTO-${Date.now()}`;

  const [header] = await db
    .insert(journalHeaders)
    .values({
      tenantId: input.tenantId,
      journalNumber: refNum.slice(0, 40),
      entryDate,
      description: input.description ?? `Автоматична статия ${input.type}`,
      documentType: input.type,
      documentId: input.documentId,
      status: 'posted',
      postedAt: new Date(),
    })
    .returning();

  const rows = [];
  for (const line of lines) {
    const accountId = await findOrCreateAccount(input.tenantId, line.account);
    rows.push({
      journalId: header.id,
      accountId,
      entryType: line.entryType as 'debit' | 'credit',
      amount: Number(line.amount).toFixed(2),
      description: line.description,
    });
  }
  await db.insert(journalLines).values(rows);
  return { success: true, journalId: header.id };
}
