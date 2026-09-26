'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { findOrCreateAccount } from '@/lib/accounting/accounts';
import {
  MANUAL_ACCOUNTS,
  manualJournalNumber,
  parseManualJournalLines,
} from '@/lib/accounting/manual-journal';
import { isUuid } from '@/lib/utils/ids';


export async function createManualJournalEntry(input: {
  lang: string;
  date: string;
  reference: string;
  description: string;
  lines: { account: string; description: string; debit: string; credit: string }[];
}): Promise<{ error?: string }> {
  try {
    const description = input.description.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: 'Изберете дата' };
    if (!description) return { error: 'Въведете описание' };

    const postings = parseManualJournalLines(input.lines);
    const { tenantId, user } = await requireTenant();
    const [year, month, day] = input.date.split('-').map(Number);
    const entryDate = new Date(year, month - 1, day);
    let journalNumber = manualJournalNumber(input.reference);

    const [clash] = await db
      .select({ id: journalHeaders.id })
      .from(journalHeaders)
      .where(eq(journalHeaders.journalNumber, journalNumber))
      .limit(1);
    if (clash) journalNumber = `${journalNumber}-${Date.now().toString().slice(-6)}`;

    const postedBy = isUuid(String(user?.id ?? '')) ? String(user.id) : null;
    const reference = input.reference.trim();

    await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(journalHeaders)
        .values({
          tenantId,
          journalNumber,
          entryDate,
          description: reference ? `${reference}: ${description}` : description,
          documentType: 'manual',
          status: 'posted',
          postedBy,
          postedAt: new Date(),
        })
        .returning({ id: journalHeaders.id });

      const rows = [];
      for (const posting of postings) {
        const meta = MANUAL_ACCOUNTS[posting.account];
        const accountId = await findOrCreateAccount(
          tenantId,
          posting.account,
          tx,
          meta.name,
          meta.type,
        );
        rows.push({
          journalId: header.id,
          accountId,
          entryType: posting.entryType,
          amount: posting.amount.toFixed(2),
          description: posting.description || description,
          currency: 'EUR',
          exchangeRate: '1.000000',
        });
      }

      await tx.insert(journalLines).values(rows);
    });

    revalidatePath(`/${input.lang}/dashboard/accounting/journal`);
    revalidatePath(`/${input.lang}/dashboard/accounting/budgets`);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Грешка при запазване';
    if (message.includes('journal_number') || message.includes('unique')) {
      return { error: 'Този номер вече съществува. Опитайте отново.' };
    }
    return { error: message };
  }
}
