'use server';

import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { tasks } from '@/lib/db/schema/tasks';
import { eq, desc, and } from 'drizzle-orm';
import { TaskGenerator } from '@/workflows/task-generator';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';

async function getTenantContext() {
  const { tenantId } = await requireTenant();
  return { tenantId };
}

export async function uploadAndAnalyzeDocument(formData: FormData) {
  try {
    const { tenantId } = await getTenantContext();

    const file = formData.get('file') as File;
    const rawText = formData.get('rawText') as string;
    const title = file && file.name ? file.name : 'Трудов Договор Иван Петров.pdf';

    const [doc] = await db
      .insert(documents)
      .values({
        tenantId,
        title,
        type: 'contract',
        status: 'pending_analysis',
      })
      .returning();

    await TaskGenerator.processDocument(doc.id, tenantId, rawText);

    revalidatePath('/[lang]/dashboard/documents');
    revalidatePath('/[lang]/dashboard/tasks');

    return { success: true, documentId: doc.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDocuments() {
  const { tenantId } = await getTenantContext();
  return db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.createdAt));
}

export async function getSuggestedTasks() {
  const { tenantId } = await getTenantContext();
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'suggested')))
    .orderBy(desc(tasks.createdAt));
}

export async function approveTask(taskId: string) {
  const { tenantId } = await getTenantContext();
  await db
    .update(tasks)
    .set({ status: 'approved' })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
  revalidatePath('/[lang]/dashboard/tasks');
  return { success: true };
}

export async function rejectTask(taskId: string) {
  const { tenantId } = await getTenantContext();
  await db
    .update(tasks)
    .set({ status: 'rejected' })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
  revalidatePath('/[lang]/dashboard/tasks');
  return { success: true };
}
