import 'server-only';

export const RAG_INDEX_MODEL = 'claude-semantic-rerank-v1';

const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 180;

export function chunkDocumentContent(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(
        normalized.lastIndexOf('\n', end),
        normalized.lastIndexOf('. ', end),
        normalized.lastIndexOf('! ', end),
        normalized.lastIndexOf('? ', end),
      );
      if (boundary > start + CHUNK_SIZE / 2) end = boundary + 1;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

export async function embedDocumentContent(content: string) {
  return { chunks: chunkDocumentContent(content), model: RAG_INDEX_MODEL };
}
