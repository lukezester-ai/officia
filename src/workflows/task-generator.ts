import { db } from '@/lib/db/db';
import { tasks } from '@/lib/db/schema/tasks';
import { documents } from '@/lib/db/schema/documents';
import { DocumentAnalyzer } from '@/ai/document-analyzer';
import { eq } from 'drizzle-orm';

export class TaskGenerator {
  /**
   * Анализира документ и автоматично генерира задачи (draft/suggested)
   */
  static async processDocument(documentId: string, tenantId: string, rawText: string) {
    // 1. Извикваме AI Анализатора
    const analysis = await DocumentAnalyzer.analyzeText(rawText);

    // 2. Обновяваме метаданните на документа
    await db.update(documents)
      .set({ 
        status: 'analyzed', 
        metadata: analysis.metadata,
        contentExtracted: rawText 
      })
      .where(eq(documents.id, documentId));

    // 3. Създаваме задачи (tasks), които очакват одобрение (suggested)
    if (analysis.suggestedTasks.length > 0) {
      const tasksToInsert = analysis.suggestedTasks.map(t => ({
        tenantId,
        documentId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        priority: t.priority,
        status: 'suggested'
      }));

      await db.insert(tasks).values(tasksToInsert);
    }

    return analysis.suggestedTasks.length;
  }
}
