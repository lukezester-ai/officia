import 'server-only';

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small';

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

export async function createEmbeddings(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for document embeddings');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs, encoding_format: 'float' }),
  });
  const payload = (await response.json()) as {
    data?: Array<{ index: number; embedding: number[] }>;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message || `OpenAI embeddings failed (${response.status})`);
  }

  return payload.data
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export async function embedDocumentContent(content: string) {
  const chunks = chunkDocumentContent(content);
  const embeddings = await createEmbeddings(chunks);
  return { chunks, embeddings, model: EMBEDDING_MODEL };
}

export async function embedQuery(query: string) {
  const [embedding] = await createEmbeddings([query.trim()]);
  return embedding;
}
