import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { eq } from 'drizzle-orm';

export const immutableTriggerSQL = `
CREATE OR REPLACE FUNCTION prevent_posted_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Недопустима операция според ЗСч: Публикувани счетоводни статии не могат да бъдат променяни или изтривани. Използвайте СТОРНО операция.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_immutable ON journal_entries;
DROP TRIGGER IF EXISTS trg_journal_immutable ON journal_headers;
CREATE TRIGGER trg_journal_immutable
BEFORE UPDATE OR DELETE ON journal_headers
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_mutation();
`;

/**
 * Червено сторно: нова posted статия със същите сметки и отрицателни суми.
 * Оригиналът не се пипа (забранено от тригера).
 */
export async function createStornoEntry(
  originalEntryId: string,
  reason: string,
  trustedTimestamp?: string,
) {
  const trimmedReason = reason?.trim();
  if (!originalEntryId || !trimmedReason) {
    return { success: false, error: 'Нужни са ID на статията и причина за сторното.' };
  }

  const [original] = await db
    .select()
    .from(journalHeaders)
    .where(eq(journalHeaders.id, originalEntryId))
    .limit(1);

  if (!original) {
    return { success: false, error: 'Счетоводната статия не е намерена.' };
  }
  if (original.status !== 'posted') {
    return { success: false, error: 'Може да се сторнира само осчетоводена (posted) статия.' };
  }
  if (original.reversedFromId) {
    return { success: false, error: 'Тази статия вече е сторно и не може да се сторнира повторно.' };
  }

  const [existingStorno] = await db
    .select({ id: journalHeaders.id })
    .from(journalHeaders)
    .where(eq(journalHeaders.reversedFromId, originalEntryId))
    .limit(1);

  if (existingStorno) {
    return {
      success: false,
      error: 'За тази статия вече има сторно.',
      stornoEntryId: existingStorno.id,
    };
  }

  const lines = await db
    .select()
    .from(journalLines)
    .where(eq(journalLines.journalId, originalEntryId));

  if (lines.length === 0) {
    return { success: false, error: 'Оригиналната статия няма редове за сторниране.' };
  }

  const suffix = Date.now().toString().slice(-6);
  const [storno] = await db
    .insert(journalHeaders)
    .values({
      tenantId: original.tenantId,
      journalNumber: `ST-${original.journalNumber}-${suffix}`,
      entryDate: new Date(),
      description: `СТОРНО към ${original.journalNumber}: ${trimmedReason}`,
      documentType: 'storno',
      documentId: original.documentId,
      reversedFromId: original.id,
      status: 'posted',
      postedAt: new Date(),
      timestampToken: trustedTimestamp || original.timestampToken,
    })
    .returning();

  await db.insert(journalLines).values(
    lines.map((line) => {
      const amount = -Math.abs(parseFloat(String(line.amount || '0')) || 0);
      return {
        journalId: storno.id,
        accountId: line.accountId,
        entryType: line.entryType,
        amount: amount.toFixed(2),
        analyticalCode: line.analyticalCode,
        divisionId: line.divisionId,
        projectId: line.projectId,
        currency: line.currency,
        exchangeRate: line.exchangeRate,
        description: `СТОРНО: ${line.description || original.journalNumber}`,
        vatCode: line.vatCode,
      };
    }),
  );

  return {
    success: true,
    originalEntryId,
    stornoEntryId: storno.id,
  };
}
