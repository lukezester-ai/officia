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

export function calcDepreciationSchedule(asset: {
  acquisitionDate: string; acquisitionCost: number; salvageValue: number;
  usefulLifeMonths: number; amortizationMethod: string;
}) {
  const months = Math.round(asset.usefulLifeMonths);
  const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
  const schedule: { month: number; year: number; depreciation: number; accumulated: number; bookValue: number }[] = [];
  const startDate = new Date(asset.acquisitionDate);
  let accumulated = 0;
  let bookValue = asset.acquisitionCost;

  for (let i = 0; i < months; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    let depreciation = 0;
    if (asset.amortizationMethod === 'declining_balance') {
      const rate = 2 / months;
      depreciation = Math.round(bookValue * rate * 100) / 100;
      if (i === months - 1) depreciation = Math.round((bookValue - asset.salvageValue) * 100) / 100;
    } else {
      depreciation = Math.round((depreciableAmount / months) * 100) / 100;
      if (i === months - 1) depreciation = Math.round((depreciableAmount - accumulated) * 100) / 100;
    }
    accumulated = Math.round((accumulated + depreciation) * 100) / 100;
    bookValue = Math.round((asset.acquisitionCost - accumulated) * 100) / 100;
    schedule.push({ month: d.getMonth() + 1, year: d.getFullYear(), depreciation, accumulated, bookValue: Math.max(bookValue, asset.salvageValue) });
  }
  return schedule;
}

export function calcCurrentBookValue(asset: {
  acquisitionDate: string; acquisitionCost: number; salvageValue: number;
  usefulLifeMonths: number; amortizationMethod: string;
}) {
  const schedule = calcDepreciationSchedule(asset);
  const now = new Date();
  const elapsed = (now.getFullYear() - new Date(asset.acquisitionDate).getFullYear()) * 12
    + (now.getMonth() - new Date(asset.acquisitionDate).getMonth());
  const idx = Math.min(elapsed, schedule.length - 1);
  if (idx < 0) return { bookValue: asset.acquisitionCost, accumulated: 0, monthlyDepreciation: schedule[0]?.depreciation || 0 };
  return { bookValue: schedule[idx].bookValue, accumulated: schedule[idx].accumulated, monthlyDepreciation: schedule[0]?.depreciation || 0 };
}