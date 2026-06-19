// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { tasks } from '@/lib/db/schema/tasks';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { TaskGenerator } from '@/workflows/task-generator';
import { revalidatePath } from 'next/cache';

export async function uploadAndAnalyzeDocument(formData: FormData) {
  try {
    const t = await db.select().from(tenants).limit(1);
    const tenantId = t[0]?.id;
    if (!tenantId) throw new Error('No tenant found');
    
    const file = formData.get('file') as File;
    const rawText = formData.get('rawText') as string;
    const title = file && file.name ? file.name : 'Трудов Договор Иван Петров.pdf'; // Fallback for MVP

    // 1. Създаваме запис за документа
    const [doc] = await db.insert(documents).values({
      tenantId,
      title,
      type: 'contract',
      status: 'pending_analysis',
    }).returning();

    // 2. Стартираме AI Workflow
    await TaskGenerator.processDocument(doc.id, tenantId, rawText);

    revalidatePath('/[lang]/dashboard/documents');
    revalidatePath('/[lang]/dashboard/tasks');

    return { success: true, documentId: doc.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDocuments() {
  return await db.select().from(documents).orderBy(desc(documents.createdAt));
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
