import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { documentEmbeddings } from '@/lib/db/schema/ai_memory';
import { documents } from '@/lib/db/schema/documents';

function terms(text: string) {
  return new Set(
    text
      .toLocaleLowerCase('bg-BG')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length >= 3),
  );
}

function lexicalScore(query: string, content: string, title: string) {
  const queryTerms = terms(query);
  if (queryTerms.size === 0) return 0;
  const contentTerms = terms(`${title} ${title} ${content}`);
  let matches = 0;
  for (const term of queryTerms) if (contentTerms.has(term)) matches += 1;
  return matches / queryTerms.size;
}

export class VectorStore {
  constructor(private readonly tenantId: string) {}

  async replaceDocumentChunks(documentId: string, textChunks: string[], model: string) {
    await db.transaction(async (tx) => {
      await tx
        .delete(documentEmbeddings)
        .where(
          and(
            eq(documentEmbeddings.tenantId, this.tenantId),
            eq(documentEmbeddings.documentId, documentId),
          ),
        );

      if (textChunks.length > 0) {
        await tx.insert(documentEmbeddings).values(
          textChunks.map((content, chunkIndex) => ({
            tenantId: this.tenantId,
            documentId,
            chunkIndex,
            content,
            embedding: [],
            model,
          })),
        );
      }
    });
    return textChunks.length;
  }

  async getCandidates(query: string, limit = 30) {
    const rows = await db
      .select({
        documentId: documentEmbeddings.documentId,
        chunkIndex: documentEmbeddings.chunkIndex,
        content: documentEmbeddings.content,
        title: documents.title,
        type: documents.type,
      })
      .from(documentEmbeddings)
      .innerJoin(documents, eq(documentEmbeddings.documentId, documents.id))
      .where(
        and(
          eq(documentEmbeddings.tenantId, this.tenantId),
          eq(documents.tenantId, this.tenantId),
        ),
      )
      .limit(200);

    return rows
      .map((row) => ({ ...row, lexicalScore: lexicalScore(query, row.content, row.title) }))
      .sort((left, right) => right.lexicalScore - left.lexicalScore)
      .slice(0, Math.max(1, Math.min(limit, 50)));
  }
}
