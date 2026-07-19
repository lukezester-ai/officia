// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { tasks } from '@/lib/db/schema/tasks';
import { requireTenant } from '@/lib/auth/get-tenant';
import { eq, desc } from 'drizzle-orm';
import { TaskGenerator } from '@/workflows/task-generator';
import { revalidatePath } from 'next/cache';
import { runDocumentLifecyclePipeline } from '@/lib/ai/orchestration';

export async function uploadAndAnalyzeDocument(formData: FormData) {
  try {
    const { tenantId, userId } = await requireTenant();
    
    const file = formData.get('file') as File;
    const rawText = formData.get('rawText') as string;
    const ocrJson = formData.get('ocrJson') as string;
    const title = file && file.name ? file.name : 'Документ.pdf';

    // 1. Създаваме запис за документа
    const [doc] = await db.insert(documents).values({
      tenantId,
      title,
      type: 'invoice',
      status: 'pending_analysis',
      contentExtracted: rawText || null,
    }).returning();

    // 2. Legacy task suggestions workflow
    await TaskGenerator.processDocument(doc.id, tenantId, rawText);

    // 3. Cross-agent pipeline: OCR → purchase draft → journal approval → bank match
    let pipeline = null;
    if (ocrJson) {
      try {
        const ocr = JSON.parse(ocrJson);
        pipeline = await runDocumentLifecyclePipeline({
          tenantId,
          userId,
          documentId: doc.id,
          ocr: {
            ...ocr,
            extractedText: ocr.extractedText || rawText,
          },
        });
      } catch (pipeErr: any) {
        pipeline = { success: false, error: pipeErr.message };
      }
    }

    revalidatePath('/[lang]/dashboard/documents');
    revalidatePath('/[lang]/dashboard/tasks');
    revalidatePath('/[lang]/dashboard/ai-inbox');
    revalidatePath('/[lang]/dashboard/purchase-invoices');

    return { success: true, documentId: doc.id, pipeline };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDocuments() {
  try {
    const { tenantId } = await requireTenant();
    const data = await db
      .select({ id: documents.id, title: documents.title, type: documents.type, status: documents.status, createdAt: documents.createdAt })
      .from(documents)
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.createdAt));
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [] };
  }
}

export async function getSuggestedTasks() {
  return await db.select().from(tasks).where(eq(tasks.status, 'suggested')).orderBy(desc(tasks.createdAt));
}

export async function approveTask(taskId: string) {
  await db.update(tasks).set({ status: 'approved' }).where(eq(tasks.id, taskId));
  revalidatePath('/[lang]/dashboard/tasks');
  return { success: true };
}

export async function rejectTask(taskId: string) {
  await db.update(tasks).set({ status: 'rejected' }).where(eq(tasks.id, taskId));
  revalidatePath('/[lang]/dashboard/tasks');
  return { success: true };
}
