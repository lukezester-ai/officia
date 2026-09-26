import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { and, desc, eq, inArray } from 'drizzle-orm';

function calendarDate(value: Date | string | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function listJournalSummaries(tenantId: string, limit = 100) {
  const headers = await db
    .select()
    .from(journalHeaders)
    .where(eq(journalHeaders.tenantId, tenantId))
    .orderBy(desc(journalHeaders.entryDate))
    .limit(limit);

  if (headers.length === 0) return [];

  const lines = await db
    .select({
      journalId: journalLines.journalId,
      entryType: journalLines.entryType,
      amount: journalLines.amount,
      accountNumber: accountPlan.accountNumber,
    })
    .from(journalLines)
    .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
    .where(
      and(
        inArray(journalLines.journalId, headers.map((header) => header.id)),
        eq(accountPlan.tenantId, tenantId),
      ),
    );

  return headers.map((header) => {
    const own = lines.filter((line) => line.journalId === header.id);
    const debits = own.filter((line) => line.entryType === 'debit');
    const credits = own.filter((line) => line.entryType === 'credit');
    const accounts = (rows: typeof own) =>
      [...new Set(rows.map((row) => row.accountNumber).filter(Boolean))].join(', ');

    return {
      id: header.id,
      entryDate: header.entryDate,
      referenceNumber: header.journalNumber,
      description: header.description ?? '',
      debitAccount: accounts(debits),
      creditAccount: accounts(credits),
      debitAmount: debits.reduce((sum, line) => sum + Number(line.amount || 0), 0),
      creditAmount: credits.reduce((sum, line) => sum + Number(line.amount || 0), 0),
    };
  });
}

export async function listAccountMovements(tenantId: string, limit = 2000) {
  const rows = await db
    .select({
      id: journalLines.id,
      entryDate: journalHeaders.entryDate,
      entryType: journalLines.entryType,
      amount: journalLines.amount,
      accountNumber: accountPlan.accountNumber,
    })
    .from(journalLines)
    .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
    .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
    .where(and(eq(journalHeaders.tenantId, tenantId), eq(accountPlan.tenantId, tenantId)))
    .orderBy(desc(journalHeaders.entryDate))
    .limit(limit);

  return rows.map((row) => {
    const amount = Number(row.amount || 0);
    const isDebit = row.entryType === 'debit';
    return {
      id: row.id,
      date: calendarDate(row.entryDate),
      debitAccount: isDebit ? row.accountNumber : '',
      creditAccount: isDebit ? '' : row.accountNumber,
      debitAmount: isDebit ? amount : 0,
      creditAmount: isDebit ? 0 : amount,
    };
  });
}
