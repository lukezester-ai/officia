'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/rbac';
import { auditLog } from '@/lib/db/schema/audit_log';

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
    const { tenantId, user } = await requireTenant();
    const gate = await requirePermission(tenantId, user.id, 'workspace:update');
    if (!gate.ok) return { success: false, error: gate.error };
    const [existing] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    
    await db.update(tenants)
      .set({
        name: data.name,
        bulstat: data.bulstat,
        vatNumber: data.vatNumber,
        address: data.address,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
    await db.insert(auditLog).values({
      tenantId, userId: user.id, action: 'UPDATE', tableName: 'tenants', recordId: tenantId,
      oldData: existing ? { name: existing.name, bulstat: existing.bulstat, vatNumber: existing.vatNumber, address: existing.address } : null,
      newData: { name: data.name, bulstat: data.bulstat, vatNumber: data.vatNumber, address: data.address },
      metadata: { source: 'workspace_settings' },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
