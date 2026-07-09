import 'server-only';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getAnthropicRouterModel } from '@/lib/ai/model';
import { embedDocumentContent } from './document-embedder';
import { VectorStore } from './vector-store';

const rankingSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      score: z.number().min(0).max(1),
    }),
  ).max(8),
});

export async function indexDocumentForRag(documentId: string, tenantId: string, content: string) {
  const { chunks, model } = await embedDocumentContent(content);
  return new VectorStore(tenantId).replaceDocumentChunks(documentId, chunks, model);
}

export async function retrieveRelevantDocuments(query: string, tenantId: string, limit = 5) {
  if (!query.trim()) return [];
  const candidates = await new VectorStore(tenantId).getCandidates(query, 30);
  if (candidates.length === 0) return [];

  if (!process.env.ANTHROPIC_API_KEY) {
    return candidates.slice(0, limit).map((candidate) => ({ ...candidate, score: candidate.combinedScore }));
  }

  const catalog = candidates
    .map((candidate, index) => `[${index}] ${candidate.title}\n${candidate.content.slice(0, 700)}`)
    .join('\n\n');

  const { object } = await generateObject({
    model: getAnthropicRouterModel(),
    schema: rankingSchema,
    temperature: 0,
    prompt: `Подреди откъсите според това доколко помагат за отговор на въпроса. Върни само релевантните резултати със score поне 0.35.\n\nВъпрос: ${query}\n\nОткъси:\n${catalog}`,
  });

  const ranked: { index: number; score: number }[] = object.results ?? [];
  return ranked
    .filter((result) => result.index < candidates.length && result.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((result) => ({ ...candidates[result.index], score: result.score }));
}

export async function retrieveRelevantContext(query: string, tenantId: string) {
  const results = await retrieveRelevantDocuments(query, tenantId, 5);
  return results
    .map((result: { title: string; content: string }, index) => `[Документ ${index + 1}: ${result.title}]\n${result.content}`)
    .join('\n\n');
}
