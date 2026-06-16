'use server';

import { db } from '@/lib/db/db';
import { fixedAssets } from '@/lib/db/schema/fixed_assets';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function getTenant() {
  const [tenant] = await db.select().from(tenants).limit(1);
  return tenant;
}

export async function getFixedAssets() {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: [] };
    const data = await db.select().from(fixedAssets).where(eq(fixedAssets.tenantId, tenant.id)).orderBy(desc(fixedAssets.createdAt));
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
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };
    const [asset] = await db.insert(fixedAssets).values({
      tenantId: tenant.id,
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
    await db.update(fixedAssets).set({ isActive: false, writtenOffAt: new Date() }).where(eq(fixedAssets.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}