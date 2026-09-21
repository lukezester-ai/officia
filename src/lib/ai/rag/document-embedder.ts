import { embedBatch } from '@/lib/ai/embeddings';

export async function embedDocumentContent(content: string): Promise<{ chunks: string[]; embeddings: number[][] }> {
  const text = content?.trim();
  if (!text) throw new Error('Празен документ за embedding.');
  const chunks = text.match(/[\s\S]{1,1000}/g) || [text];
  const embeddings = await embedBatch(chunks);
  return { chunks, embeddings };
}
