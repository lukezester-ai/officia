import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';
import { indexDocumentForRag } from '@/lib/ai/rag/retriever';
import { withRateLimit } from '@/lib/api/rate-limit';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await getAuthenticatedTenant();
  if (!auth.ok) return auth.response;
  return withRateLimit(
    `rag-reindex:${auth.tenantId}`,
    async () => {
      const rows = await db
        .select({ id: documents.id, content: documents.contentExtracted })
        .from(documents)
        .where(and(eq(documents.tenantId, auth.tenantId), isNotNull(documents.contentExtracted)));

      let indexedDocuments = 0;
      let indexedChunks = 0;
      const failures: Array<{ documentId: string; error: string }> = [];

      for (const document of rows) {
        if (!document.content?.trim()) continue;
        try {
          indexedChunks += await indexDocumentForRag(document.id, auth.tenantId, document.content);
          indexedDocuments += 1;
        } catch (error) {
          failures.push({
            documentId: document.id,
            error: error instanceof Error ? error.message : 'Неизвестна грешка при индексиране',
          });
        }
      }

      return Response.json({ indexedDocuments, indexedChunks, failures });
    },
    2,
    60_000,
  );
}
