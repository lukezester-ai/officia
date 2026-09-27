'use server';

import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { tasks } from '@/lib/db/schema/tasks';
import { counterparties } from '@/lib/db/schema/counterparties';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { requireTenant } from '@/lib/auth/get-tenant';
import { chooseInvoiceNumber } from '@/lib/accounting/invoice-number';
import { splitDealAmount } from '@/lib/crm/deal-invoice';
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
        invoiceId: documents.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(counterparties, and(
        eq(documents.counterpartyId, counterparties.id),
        eq(counterparties.tenantId, tenantId),
      ))
      .leftJoin(invoices, and(
        eq(documents.invoiceId, invoices.id),
        eq(invoices.tenantId, tenantId),
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

export async function createDocumentTask(documentId: string) {
  try {
    const { tenantId } = await requireTenant();
    const docId = parseUuidParam(documentId);
    if (!docId) return { success: false as const, error: 'Документът не е от този акаунт.' };

    const [doc] = await db.select({
      id: documents.id,
      title: documents.title,
      counterpartyName: counterparties.name,
    }).from(documents)
      .leftJoin(counterparties, and(
        eq(documents.counterpartyId, counterparties.id),
        eq(counterparties.tenantId, tenantId),
      ))
      .where(and(eq(documents.id, docId), eq(documents.tenantId, tenantId)))
      .limit(1);
    if (!doc) return { success: false as const, error: 'Документът не е от този акаунт.' };

    const [existing] = await db.select({ id: tasks.id }).from(tasks).where(and(
      eq(tasks.tenantId, tenantId),
      eq(tasks.documentId, doc.id),
      eq(tasks.status, 'suggested'),
    )).limit(1);
    if (existing) return { success: true as const, id: existing.id, already: true };

    const [created] = await db.insert(tasks).values({
      tenantId,
      documentId: doc.id,
      title: `Прегледай ${doc.title}`.slice(0, 200),
      description: doc.counterpartyName ? `Файл към ${doc.counterpartyName}.` : 'Файл от архива.',
      status: 'suggested',
      priority: 'medium',
    }).returning({ id: tasks.id });

    revalidatePath('/', 'layout');
    return { success: true as const, id: created.id, already: false };
  } catch (error) {
    console.error('[create-document-task]', error);
    return { success: false as const, error: 'Задачата не беше записана.' };
  }
}

function grossFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  for (const key of ['total', 'totalAmount', 'amount', 'sum']) {
    const raw = record[key];
    if (raw == null || raw === '') continue;
    const value = Number(String(raw).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
    if (Number.isFinite(value) && value > 0) return value.toFixed(2);
  }
  return null;
}

export async function createDocumentInvoice(documentId: string) {
  try {
    const { tenantId } = await requireTenant();
    const docId = parseUuidParam(documentId);
    if (!docId) return { success: false as const, error: 'Документът не е от този акаунт.' };

    const [doc] = await db.select({
      id: documents.id,
      title: documents.title,
      invoiceId: documents.invoiceId,
      counterpartyId: documents.counterpartyId,
      metadata: documents.metadata,
    }).from(documents)
      .where(and(eq(documents.id, docId), eq(documents.tenantId, tenantId)))
      .limit(1);
    if (!doc) return { success: false as const, error: 'Документът не е от този акаунт.' };

    if (doc.invoiceId) {
      const [existing] = await db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
      }).from(invoices)
        .where(and(eq(invoices.id, doc.invoiceId), eq(invoices.tenantId, tenantId)))
        .limit(1);
      if (existing) {
        return { success: true as const, already: true, id: existing.id, invoiceNumber: existing.invoiceNumber };
      }
    }

    const [client] = doc.counterpartyId
      ? await db.select().from(counterparties).where(and(
        eq(counterparties.id, doc.counterpartyId),
        eq(counterparties.tenantId, tenantId),
      )).limit(1)
      : [];
    if (!client) return { success: false as const, error: 'Първо свържи файла с клиент.' };

    const amounts = splitDealAmount(grossFromMetadata(doc.metadata) || '0');
    if (!amounts) return { success: false as const, error: 'Сумата от файла не става за фактура.' };

    const taken = await db.select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));
    const invoiceNumber = chooseInvoiceNumber('', taken.map((row) => row.invoiceNumber));
    const clientName = client.name;
    const address = [client.address, client.city].filter(Boolean).join(', ') || null;
    const today = new Date().toISOString().slice(0, 10);
    const description = doc.title.slice(0, 200);
    const { assertCanCreateInvoice } = await import('@/lib/billing/entitlements');
    await assertCanCreateInvoice();

    const invoiceId = await db.transaction(async (tx) => {
      const [invoice] = await tx.insert(invoices).values({
        tenantId,
        invoiceNumber,
        type: 'invoice',
        status: 'draft',
        issueDate: today,
        clientName,
        counterpartyName: clientName,
        clientAddress: address,
        counterpartyAddress: address,
        clientVatNumber: client.vatNumber || client.eik || null,
        counterpartyEik: client.eik || null,
        counterpartyVat: client.vatNumber || null,
        subtotal: amounts.net,
        netAmount: amounts.net,
        amount: amounts.net,
        vatAmount: amounts.vat,
        totalAmount: amounts.total,
        total: amounts.total,
        notes: `От архив: ${doc.title}`.slice(0, 500),
        vatPosted: false,
        items: [{
          description,
          quantity: 1,
          unitPrice: Number(amounts.net),
          vatRate: 20,
          total: Number(amounts.net),
        }],
      }).returning({ id: invoices.id });
      if (!invoice?.id) throw new Error('Фактурата не беше записана');
      await tx.insert(invoiceLines).values({
        invoiceId: invoice.id,
        description,
        quantity: '1',
        unitPrice: amounts.net,
        vatRate: '20',
        lineNet: amounts.net,
        lineVat: amounts.vat,
        lineTotal: amounts.total,
      });
      await tx.update(documents)
        .set({ invoiceId: invoice.id })
        .where(and(eq(documents.id, doc.id), eq(documents.tenantId, tenantId)));
      return invoice.id;
    });

    revalidatePath('/', 'layout');
    return { success: true as const, already: false, id: invoiceId, invoiceNumber };
  } catch (error) {
    console.error('[create-document-invoice]', error);
    return { success: false as const, error: 'Фактурата не беше записана.' };
  }
}

export async function getSuggestedTasks() {
  const { tenantId } = await requireTenant();
  return db.select().from(tasks).where(and(
    eq(tasks.tenantId, tenantId),
    eq(tasks.status, 'suggested'),
  )).orderBy(desc(tasks.createdAt));
}

export async function approveTask(taskId: string) {
  const { tenantId } = await requireTenant();
  const id = parseUuidParam(taskId);
  if (!id) return { success: false as const, error: 'Задачата не е от този акаунт.' };
  const [row] = await db.update(tasks)
    .set({ status: 'approved' })
    .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
    .returning({ id: tasks.id });
  if (!row) return { success: false as const, error: 'Задачата не е от този акаунт.' };
  revalidatePath('/', 'layout');
  return { success: true as const };
}

export async function rejectTask(taskId: string) {
  const { tenantId } = await requireTenant();
  const id = parseUuidParam(taskId);
  if (!id) return { success: false as const, error: 'Задачата не е от този акаунт.' };
  const [row] = await db.update(tasks)
    .set({ status: 'rejected' })
    .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
    .returning({ id: tasks.id });
  if (!row) return { success: false as const, error: 'Задачата не е от този акаунт.' };
  revalidatePath('/', 'layout');
  return { success: true as const };
}
