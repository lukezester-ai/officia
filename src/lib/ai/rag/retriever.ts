import 'server-only';

import { embedDocumentContent, embedQuery } from './document-embedder';
import { VectorStore } from './vector-store';

export async function indexDocumentForRag(documentId: string, tenantId: string, content: string) {
  const { chunks, embeddings, model } = await embedDocumentContent(content);
  return new VectorStore(tenantId).replaceDocumentEmbeddings(documentId, chunks, embeddings, model);
}

export async function retrieveRelevantDocuments(query: string, tenantId: string, limit = 5) {
  if (!query.trim() || !process.env.OPENAI_API_KEY) return [];
  const queryEmbedding = await embedQuery(query);
  return new VectorStore(tenantId).searchSimilar(queryEmbedding, limit);
}

export async function retrieveRelevantContext(query: string, tenantId: string) {
  const results = await retrieveRelevantDocuments(query, tenantId, 5);
  if (results.length === 0) return '';

  return results
    .map(
      (result, index) =>
        `[Документ ${index + 1}: ${result.title}; сходство ${result.score.toFixed(3)}]\n${result.content}`,
    )
    .join('\n\n');
}
