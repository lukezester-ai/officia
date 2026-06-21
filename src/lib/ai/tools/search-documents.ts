// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { eq, and, or, ilike } from 'drizzle-orm';

export const buildSearchDocumentsTool = (tenantId: string) => tool({
  description: "Търси в качените документи, договори и фактури на базата на ключови думи в текста или заглавието им.",
  parameters: z.object({
    query: z.string().describe("Заявка за търсене (ключова дума, име на фирма, продукт и т.н.)"),
    documentType: z.enum(["all", "invoice", "contract", "receipt"]).optional().describe("Филтър по тип документ. По подразбиране е 'all'."),
  }),
  execute: async ({ query, documentType }) => {
    try {
      const searchPattern = `%${query}%`;
      
      // Базови условия: задължително за тази фирма (tenantId)
      const conditions = [eq(documents.tenantId, tenantId)];
      
      // Добавяме филтър по тип, ако е подаден
      if (documentType && documentType !== 'all') {
        conditions.push(eq(documents.type, documentType));
      }
      
      // Търсене в заглавието, съдържанието и AI резюмето
      conditions.push(
        or(
          ilike(documents.title, searchPattern),
          ilike(documents.contentExtracted, searchPattern),
          ilike(documents.aiSummary, searchPattern)
        )
      );

      const results = await db
        .select({
          id: documents.id,
          title: documents.title,
          type: documents.type,
          summary: documents.aiSummary,
          createdAt: documents.createdAt
        })
        .from(documents)
        .where(and(...conditions))
        .limit(5); // Връщаме топ 5 най-релевантни резултата

      if (results.length === 0) {
         return {
           results: [],
           message: `Не намерих никакви документи в архива, отговарящи на търсенето "${query}".`,
         };
      }

      return {
        results,
        message: `Намерени са ${results.length} документа отговарящи на заявката.`,
      };
    } catch (err: any) {
      console.error("AI Search Documents Error:", err);
      return {
        success: false,
        message: `Грешка при търсене: ${err.message}`
      };
    }
  },
});
