'use server';

import { eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { requirePermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db/db';
import { auditLog } from '@/lib/db/schema/audit_log';
import { tenants } from '@/lib/db/schema/tenants';

export async function removeLogo() {
  try {
    const { tenantId, user } = await requireTenant();
    const gate = await requirePermission(tenantId, user.id, 'workspace:update');
    if (!gate.ok) return { success: false, error: gate.error };

    await db
      .update(tenants)
      .set({ logoUrl: null, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Грешка при премахване на логото' };
  }
}

export async function getTenantProfile() {
  try {
    const { tenant } = await requireTenant();
    if (!tenant) {
      return { success: false, error: 'Фирменият профил не е намерен' };
    }

    return { success: true, data: tenant };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Грешка при зареждане на фирмения профил' };
  }
}

export async function updateTenantProfile(data: {
  name: string;
  bulstat: string;
  vatNumber?: string;
  address?: string;
}) {
  try {
    const { tenantId, user } = await requireTenant();
    const gate = await requirePermission(tenantId, user.id, 'workspace:update');
    if (!gate.ok) return { success: false, error: gate.error };

    const [existing] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

    await db
      .update(tenants)
      .set({
        name: data.name,
        bulstat: data.bulstat,
        vatNumber: data.vatNumber,
        address: data.address,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    await db.insert(auditLog).values({
      tenantId,
      userId: user.id,
      action: 'UPDATE',
      tableName: 'tenants',
      recordId: tenantId,
      oldData: existing
        ? {
            name: existing.name,
            bulstat: existing.bulstat,
            vatNumber: existing.vatNumber,
            address: existing.address,
          }
        : null,
      newData: {
        name: data.name,
        bulstat: data.bulstat,
        vatNumber: data.vatNumber,
        address: data.address,
      },
      metadata: { source: 'workspace_settings' },
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Грешка при записване на фирмения профил' };
  }
}
