import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { documentEmbeddings } from '@/lib/db/schema/ai_memory';
import { documents } from '@/lib/db/schema/documents';
import { generateEmbedding, cosineSimilarity, EMBEDDING_DIM } from './embedding';

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
            embedding: generateEmbedding(content),
            model,
          })),
        );
      }
    });
    return textChunks.length;
  }

  async getCandidates(query: string, limit = 30) {
    const queryEmbedding = generateEmbedding(query);

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
      )
      .limit(200);

    return rows
      .map((row) => {
        const denseScore =
          Array.isArray(row.embedding) && row.embedding.length === EMBEDDING_DIM
            ? cosineSimilarity(queryEmbedding, row.embedding as number[])
            : 0;
        const lexical = lexicalScore(query, row.content, row.title);
        return {
          documentId: row.documentId,
          chunkIndex: row.chunkIndex,
          content: row.content,
          title: row.title,
          type: row.type,
          lexicalScore: lexical,
          denseScore,
          combinedScore: lexical * 0.4 + denseScore * 0.6,
        };
      })
      .sort((left, right) => right.combinedScore - left.combinedScore)
      .slice(0, Math.max(1, Math.min(limit, 50)));
  }
}
