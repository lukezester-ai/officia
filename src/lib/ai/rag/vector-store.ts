import { getRelevantMemories, writeMemory } from '@/lib/ai/memory';

export class VectorStore {
  constructor(private tenantId: string) {
    if (!tenantId) throw new Error('VectorStore изисква tenantId.');
  }

  async storeEmbeddings(documentId: string, textChunks: string[], embeddings: number[][]) {
    if (textChunks.length !== embeddings.length) {
      throw new Error('Броят на chunk-овете и embeddings не съвпада.');
    }
    for (let i = 0; i < textChunks.length; i += 1) {
      await writeMemory({
        clientId: this.tenantId,
        content: textChunks[i],
        memoryType: 'fact',
        metadata: { documentId, chunk: i },
      });
    }
    return true;
  }

  async searchSimilar(query: string, limit: number = 5) {
    return getRelevantMemories(this.tenantId, query, limit);
  }
}
