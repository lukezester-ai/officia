'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';

export async function getTenantProfile() {
  try {
    const { tenant } = await requireTenant();
    if (!tenant) return { success: false, error: 'Търговското дружество не е намерено' };
    
    return { success: true, data: tenant };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantProfile(data: { name: string; bulstat: string; vatNumber?: string; address?: string }) {
  try {
    const { tenantId } = await requireTenant();
    
    await db.update(tenants)
      .set({
        name: data.name,
        bulstat: data.bulstat,
        vatNumber: data.vatNumber,
        address: data.address,
      })
      .where(eq(tenants.id, tenantId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
