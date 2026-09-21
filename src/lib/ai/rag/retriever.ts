import { VectorStore } from './vector-store';

export async function retrieveRelevantContext(tenantId: string, query: string): Promise<string> {
  if (!tenantId || !query?.trim()) return '';
  const store = new VectorStore(tenantId);
  const results = await store.searchSimilar(query, 3);
  if (!results.length) return '';
  return results.map((r) => r.content).filter(Boolean).join('\n');
}
