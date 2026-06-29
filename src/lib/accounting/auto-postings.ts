import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { and, eq } from 'drizzle-orm';

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
}

function buildLines(input: AutoPostingInput): PostingLine[] {
  const net = input.amount - (input.vatAmount ?? 0);
  const vat = input.vatAmount ?? 0;

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

async function getAccountIdByNumber(tenantId: string, accountNumber: string) {
  const [account] = await db
    .select({ id: accountPlan.id })
    .from(accountPlan)
    .where(and(eq(accountPlan.tenantId, tenantId), eq(accountPlan.accountNumber, accountNumber)))
    .limit(1);

  return account?.id ?? null;
}

export async function createAutoPostings(input: AutoPostingInput): Promise<void> {
  const lines = buildLines(input);
  if (lines.length === 0) return;

  const entryDate = input.date ?? new Date();
  const refNum = input.reference ?? `AUTO-${Date.now()}`;

  const [header] = await db
    .insert(journalHeaders)
    .values({
      tenantId: input.tenantId,
      journalNumber: refNum,
      entryDate,
      description: input.description ?? 'Automatic posting',
      status: 'posted',
    })
    .returning();

  const journalLineValues: Array<typeof journalLines.$inferInsert> = [];

  for (const line of lines) {
    const accountId = await getAccountIdByNumber(input.tenantId, line.account);
    if (!accountId) continue;

    if (line.debit > 0) {
      journalLineValues.push({
        journalId: header.id,
        accountId,
        entryType: 'debit',
        amount: String(line.debit),
        description: line.description,
      });
    }

    if (line.credit > 0) {
      journalLineValues.push({
        journalId: header.id,
        accountId,
        entryType: 'credit',
        amount: String(line.credit),
        description: line.description,
      });
    }
  }

  if (journalLineValues.length > 0) {
    await db.insert(journalLines).values(journalLineValues);
  }
}
