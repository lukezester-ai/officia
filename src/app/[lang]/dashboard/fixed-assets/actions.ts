'use server';

import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { documents } from '@/lib/db/schema/documents';
import { and, eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireTenant } from '@/lib/auth/get-tenant';
import { parseUuidParam } from '@/lib/utils/ids';

export async function getFixedAssets() {
  try {
    const { tenantId } = await requireTenant();
    const data = await db.select({
      id: fixedAssets.id,
      tenantId: fixedAssets.tenantId,
      inventoryNumber: fixedAssets.inventoryNumber,
      name: fixedAssets.name,
      acquisitionDate: fixedAssets.acquisitionDate,
      acquisitionCost: fixedAssets.acquisitionCost,
      salvageValue: fixedAssets.salvageValue,
      usefulLifeMonths: fixedAssets.usefulLifeMonths,
      amortizationMethod: fixedAssets.amortizationMethod,
      isActive: fixedAssets.isActive,
      documentId: fixedAssets.documentId,
      documentTitle: documents.title,
      fileUrl: documents.fileUrl,
      writtenOffAt: fixedAssets.writtenOffAt,
      createdAt: fixedAssets.createdAt,
    }).from(fixedAssets)
      .leftJoin(documents, and(
        eq(fixedAssets.documentId, documents.id),
        eq(documents.tenantId, tenantId),
      ))
      .where(eq(fixedAssets.tenantId, tenantId))
      .orderBy(desc(fixedAssets.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createFixedAsset(input: {
  inventoryNumber: string; name: string; acquisitionDate: string;
  acquisitionCost: number; salvageValue: number; usefulLifeMonths: number; amortizationMethod: string;
}) {
  try {
    const { tenantId } = await requireTenant();
    const [asset] = await db.insert(fixedAssets).values({
      tenantId: tenantId,
      inventoryNumber: input.inventoryNumber,
      name: input.name,
      acquisitionDate: input.acquisitionDate,
      acquisitionCost: input.acquisitionCost.toString(),
      salvageValue: input.salvageValue.toString(),
      usefulLifeMonths: input.usefulLifeMonths.toString(),
      amortizationMethod: input.amortizationMethod,
      isActive: true,
    }).returning();
    revalidatePath('/', 'layout');
    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function linkAssetDocument(assetId: string, documentId: string) {
  try {
    const { tenantId } = await requireTenant();
    const asset = parseUuidParam(assetId);
    const docId = parseUuidParam(documentId);
    if (!asset || !docId) return { success: false as const, error: 'Избери файл от архива.' };

    const [doc] = await db.select({ id: documents.id, title: documents.title, fileUrl: documents.fileUrl })
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.tenantId, tenantId)))
      .limit(1);
    if (!doc) return { success: false as const, error: 'Файлът не е от този акаунт.' };

    const [current] = await db.select({ id: fixedAssets.id, documentId: fixedAssets.documentId })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.id, asset), eq(fixedAssets.tenantId, tenantId)))
      .limit(1);
    if (!current) return { success: false as const, error: 'Активът не е от този акаунт.' };
    if (current.documentId === doc.id) {
      return { success: true as const, already: true, documentId: doc.id, title: doc.title, fileUrl: doc.fileUrl };
    }

    const [updated] = await db.update(fixedAssets)
      .set({ documentId: doc.id })
      .where(and(eq(fixedAssets.id, asset), eq(fixedAssets.tenantId, tenantId)))
      .returning({ id: fixedAssets.id });
    if (!updated) return { success: false as const, error: 'Активът не е от този акаунт.' };

    revalidatePath('/', 'layout');
    return { success: true as const, already: false, documentId: doc.id, title: doc.title, fileUrl: doc.fileUrl };
  } catch (error) {
    console.error('[link-asset-document]', error);
    return { success: false as const, error: 'Документът не беше добавен.' };
  }
}

export async function writeOffAsset(id: string) {
  try {
    const { tenantId } = await requireTenant();
    const assetId = parseUuidParam(id);
    if (!assetId) return { success: false, error: 'Активът не е от този акаунт.' };
    const [updated] = await db.update(fixedAssets)
      .set({ isActive: false, writtenOffAt: new Date() })
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.tenantId, tenantId)))
      .returning({ id: fixedAssets.id });
    if (!updated) return { success: false, error: 'Активът не е от този акаунт.' };
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}