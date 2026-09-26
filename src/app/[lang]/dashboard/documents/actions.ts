'use server';

import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { tasks } from '@/lib/db/schema/tasks';
import { counterparties } from '@/lib/db/schema/counterparties';
import { requireTenant } from '@/lib/auth/get-tenant';
import { parseUuidParam } from '@/lib/utils/ids';
import { eq, desc, and } from 'drizzle-orm';
import { TaskGenerator } from '@/workflows/task-generator';
import { revalidatePath } from 'next/cache';
import { saveArchiveFile } from '@/lib/documents/files';

export async function uploadAndAnalyzeDocument(formData: FormData) {
  try {
    const { tenantId } = await requireTenant();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size <= 0) {
      return { success: false as const, error: 'Избери файл.' };
    }
    const rawText = String(formData.get('rawText') || '').trim();
    const title = file.name.trim().slice(0, 255) || 'Документ';

    const [doc] = await db.insert(documents).values({
      tenantId,
      title,
      type: 'other',
      status: 'active',
    }).returning();

    let saved: { relative: string };
    try {
      saved = await saveArchiveFile(tenantId, doc.id, file);
    } catch (error) {
      await db.delete(documents).where(and(eq(documents.id, doc.id), eq(documents.tenantId, tenantId)));
      throw error;
    }
    await db.update(documents).set({
      fileUrl: saved.relative,
      contentExtracted: rawText || null,
    }).where(and(eq(documents.id, doc.id), eq(documents.tenantId, tenantId)));

    if (rawText) {
      try {
        await TaskGenerator.processDocument(doc.id, tenantId, rawText);
      } catch (error) {
        console.error('[archive-analyze]', error);
      }
    }

    revalidatePath('/[lang]/dashboard/documents');
    revalidatePath('/[lang]/dashboard/tasks');

    return { success: true as const, documentId: doc.id };
  } catch (error: unknown) {
    console.error('[archive-upload]', error);
    const message = error instanceof Error ? error.message : '';
    if (message === 'Файлът е PDF, Word, текст или снимка.' || message === 'Файлът е до 5 MB.') {
      return { success: false as const, error: message };
    }
    return { success: false as const, error: 'Файлът не беше качен.' };
  }
}

export async function getDocuments() {
  try {
    const { tenantId } = await requireTenant();
    const data = await db
      .select({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        status: documents.status,
        fileUrl: documents.fileUrl,
        contentExtracted: documents.contentExtracted,
        metadata: documents.metadata,
        aiStatus: documents.aiStatus,
        aiSummary: documents.aiSummary,
        counterpartyId: documents.counterpartyId,
        counterpartyName: counterparties.name,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(counterparties, and(
        eq(documents.counterpartyId, counterparties.id),
        eq(counterparties.tenantId, tenantId),
      ))
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.createdAt));
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [] };
  }
}

export async function linkDocumentToClient(documentId: string, counterpartyId: string) {
  try {
    const { tenantId } = await requireTenant();
    const docId = parseUuidParam(documentId);
    const clientId = parseUuidParam(counterpartyId);
    if (!docId || !clientId) return { success: false as const, error: 'Избери клиент.' };

    const [client] = await db.select({ id: counterparties.id, name: counterparties.name })
      .from(counterparties)
      .where(and(eq(counterparties.id, clientId), eq(counterparties.tenantId, tenantId)))
      .limit(1);
    if (!client) return { success: false as const, error: 'Клиентът не е от този акаунт.' };

    const [doc] = await db.update(documents)
      .set({ counterpartyId: client.id })
      .where(and(eq(documents.id, docId), eq(documents.tenantId, tenantId)))
      .returning({ id: documents.id });
    if (!doc) return { success: false as const, error: 'Документът не е от този акаунт.' };

    revalidatePath('/', 'layout');
    return { success: true as const, counterpartyName: client.name };
  } catch (error) {
    console.error('[link-document]', error);
    return { success: false as const, error: 'Документът не беше свързан.' };
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
