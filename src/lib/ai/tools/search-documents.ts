import { tool } from 'ai';
import { z } from 'zod';
import { and, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { retrieveRelevantDocuments } from '@/lib/ai/rag/retriever';

const searchSchema = z.object({
  query: z.string().min(1),
  documentType: z.enum(['all', 'invoice', 'contract', 'receipt']).optional().default('all'),
});

export const buildSearchDocumentsTool = (tenantId: string) =>
  tool({
    description: 'Търси семантично в съдържанието на фирмените документи с текстов fallback.',
    inputSchema: searchSchema,
    execute: async ({ query, documentType }: z.infer<typeof searchSchema>) => {
      const semanticResults = await retrieveRelevantDocuments(query, tenantId, 10);
      const relevant = semanticResults
        .filter((result) => documentType === 'all' || result.type === documentType)
        .slice(0, 5);

      if (relevant.length > 0) {
        return {
          searchMode: 'semantic',
          results: relevant.map((result) => ({
            id: result.documentId,
            title: result.title,
            type: result.type,
            excerpt: result.content,
            relevance: Number(result.score.toFixed(3)),
          })),
          message: `Намерени са ${relevant.length} семантично релевантни документа.`,
        };
      }

      const pattern = `%${query}%`;
      const conditions = [eq(documents.tenantId, tenantId)];
      if (documentType !== 'all') conditions.push(eq(documents.type, documentType));
      const textCondition = or(
        ilike(documents.title, pattern),
        ilike(documents.contentExtracted, pattern),
        ilike(documents.aiSummary, pattern),
      );
      if (textCondition) conditions.push(textCondition);

      const results = await db
        .select({
          id: documents.id,
          title: documents.title,
          type: documents.type,
          summary: documents.aiSummary,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(and(...conditions))
        .limit(5);

      return {
        searchMode: 'lexical',
        results,
        message:
          results.length > 0
            ? `Намерени са ${results.length} документа.`
            : `Няма документи, отговарящи на „${query}“.`,
      };
    },
  });
