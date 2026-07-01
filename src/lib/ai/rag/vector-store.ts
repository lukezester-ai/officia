import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { documentEmbeddings } from '@/lib/db/schema/ai_memory';
import { documents } from '@/lib/db/schema/documents';

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) return -1;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? -1 : dot / denominator;
}

export class VectorStore {
  constructor(private readonly tenantId: string) {}

  async replaceDocumentEmbeddings(
    documentId: string,
    textChunks: string[],
    embeddings: number[][],
    model: string,
  ) {
    if (textChunks.length !== embeddings.length) {
      throw new Error('Embedding count does not match document chunk count');
    }

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
            embedding: embeddings[chunkIndex],
            model,
          })),
        );
      }
    });

    return textChunks.length;
  }

  async searchSimilar(queryEmbedding: number[], limit = 5, minimumScore = 0.2) {
    const rows = await db
      .select({
        documentId: documentEmbeddings.documentId,
        chunkIndex: documentEmbeddings.chunkIndex,
        content: documentEmbeddings.content,
        embedding: documentEmbeddings.embedding,
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
      );

    return rows
      .map((row) => ({
        documentId: row.documentId,
        chunkIndex: row.chunkIndex,
        title: row.title,
        type: row.type,
        content: row.content,
        score: cosineSimilarity(queryEmbedding, row.embedding),
      }))
      .filter((row) => row.score >= minimumScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(1, Math.min(limit, 20)));
  }
}
