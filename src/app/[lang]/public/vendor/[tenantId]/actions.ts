'use server';

import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { documents } from '@/lib/db/schema/documents';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { eq } from 'drizzle-orm';

/**
 * Взима базово инфо за фирмата (за публичния портал)
 */
export async function getPublicTenantInfo(tenantId: string) {
  try {
    const records = await db.select({ name: tenants.name, bulstat: tenants.bulstat }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!records || records.length === 0) return { success: false, error: 'Фирмата не е намерена.' };
    
    return { success: true, data: records[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Обработва качения файл от външен доставчик
 * В MVP версията симулираме записването на файла (например в public/uploads) 
 * и директно създаваме запис в documents и ai_inbox.
 */
export async function submitVendorDocument(tenantId: string, fileName: string, fileType: string, base64Data?: string) {
  try {
    // 1. Създаваме запис в таблицата Documents
    const [newDoc] = await db.insert(documents).values({
      tenantId,
      title: fileName,
      type: 'invoice', // приемаме, че доставчикът качва фактура
      status: 'pending_analysis',
      aiStatus: 'needs_review'
    }).returning();

    // 2. Създаваме Alert / Ticket в AI Inbox-а, за да види счетоводителят, че има нов документ
    await db.insert(aiInboxItems).values({
      tenantId,
      type: 'vendor_upload',
      sourceType: 'document',
      sourceId: newDoc.id,
      title: `Нова фактура от доставчик`,
      description: `Получен е нов документ: ${fileName}. Изчаква AI сканиране (OCR).`,
      priority: 'normal',
      status: 'open'
    });

    return { success: true, documentId: newDoc.id };
  } catch (error: any) {
    console.error('[Vendor Upload Error]', error);
    return { success: false, error: error.message };
  }
}
