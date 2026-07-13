// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireTenant } from '@/lib/auth/get-tenant';

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
      writtenOffAt: fixedAssets.writtenOffAt,
      createdAt: fixedAssets.createdAt,
    }).from(fixedAssets).where(eq(fixedAssets.tenantId, tenantId)).orderBy(desc(fixedAssets.createdAt));
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

export async function writeOffAsset(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await db.update(fixedAssets).set({ isActive: false, writtenOffAt: new Date() }).where(eq(fixedAssets.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}