'use server';

import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';

async function getTenantContext() {
  const { tenantId } = await requireTenant();
  return { tenantId };
}

export async function getFixedAssets() {
  try {
    const { tenantId } = await getTenantContext();
    const data = await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.tenantId, tenantId))
      .orderBy(desc(fixedAssets.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createFixedAsset(input: {
  inventoryNumber: string;
  name: string;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  amortizationMethod: string;
}) {
  try {
    const { tenantId } = await getTenantContext();
    const [asset] = await db
      .insert(fixedAssets)
      .values({
        tenantId,
        inventoryNumber: input.inventoryNumber,
        name: input.name,
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost.toString(),
        salvageValue: input.salvageValue.toString(),
        usefulLifeMonths: input.usefulLifeMonths.toString(),
        amortizationMethod: input.amortizationMethod,
        isActive: true,
      })
      .returning();
    revalidatePath('/', 'layout');
    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function writeOffAsset(id: string) {
  try {
    const { tenantId } = await getTenantContext();
    await db
      .update(fixedAssets)
      .set({ isActive: false, writtenOffAt: new Date() })
      .where(and(eq(fixedAssets.id, id), eq(fixedAssets.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
