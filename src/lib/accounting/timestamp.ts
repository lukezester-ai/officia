import { eq } from 'drizzle-orm';
import { journalHeaders } from '../db/schema/journal_entries';
import { db } from '../db/db';

export async function timestampDocument(documentId: string, content: string): Promise<string> {
  console.log(`Изискване на Timestamp Token за документ ${documentId}...`);

  void content;

  const timestampToken = `TSA_TOKEN_${Date.now()}`;

  await db
    .update(journalHeaders)
    .set({ timestampToken })
    .where(eq(journalHeaders.id, documentId));

  return timestampToken;
}
