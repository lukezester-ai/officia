import { VectorStore } from './vector-store';
import { embedDocumentContent } from './document-embedder';

export async function retrieveRelevantContext(tenantId: string, query: string): Promise<string> {
  const store = new VectorStore(tenantId);
  const { embeddings } = await embedDocumentContent(query);
  
  if (embeddings.length === 0) return "";

  // Търсим топ 3 най-близки резултата в базата
  const results = await store.searchSimilar(embeddings[0], 3);
  
  // В момента връщаме празен низ, тъй като нямаме истинска база
  return results.length ? "Намерен контекст от базата..." : "";
}
