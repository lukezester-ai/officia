// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { eq } from 'drizzle-orm';

export const analyzeDocumentTool = tool({
  description: "Анализира качен документ (фактура, касова бележка) и извлича данни от него",
  parameters: z.object({
    documentId: z.string().describe("ID на документа, качен в системата"),
    documentType: z.enum(["invoice", "receipt", "contract", "other"]).describe("Предполагаем тип на документа"),
  }),
  execute: async ({ documentId, documentType }: { documentId: string; documentType: string }) => {
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc) {
      return {
        success: false,
        message: `Документ ${documentId} не е намерен.`,
      };
    }

    const metadata = doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : null;
    if (!doc.contentExtracted && !metadata) {
      return {
        success: false,
        documentId,
        documentType,
        message: 'Документът няма извлечен текст. Стартирайте OCR върху файла, преди анализ.',
      };
    }

    return {
      success: true,
      documentId,
      documentType: documentType || doc.type,
      extractedData: metadata || { text: doc.contentExtracted },
      summary: doc.aiSummary || null,
      message: 'Извлечени са реалните данни от документа.',
    };
  },
});
