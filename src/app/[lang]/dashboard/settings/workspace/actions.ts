'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { tenants } from '@/lib/db/schema/tenants';
import { tenantInvites } from '@/lib/db/schema/tenant_invites';
import { eq } from 'drizzle-orm';
import { assertCanInviteUser, getEntitlement, listTenantInvites, listTenantUsers } from '@/lib/billing/entitlements';

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

export async function getWorkspacePlan() {
  try {
    const access = await getEntitlement();
    const members = await listTenantUsers(access.tenantId);
    const invites = await listTenantInvites(access.tenantId);
    return {
      success: true as const,
      data: {
        plan: access.plan,
        active: access.active,
        daysLeft: access.daysLeft,
        limits: access.limits,
        usage: access.usage,
        members: members.map((member) => ({ email: member.email, name: member.name })),
        invites: invites.map((invite) => invite.email),
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

export async function inviteWorkspaceUser(email: string) {
  try {
    const access = await assertCanInviteUser();
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@') || normalized.length > 200) {
      return { success: false as const, error: 'Въведете имейл.' };
    }
    await db.insert(tenantInvites).values({
      tenantId: access.tenantId,
      email: normalized,
    });
    return { success: true as const };
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('tenant_invites_tenant_email_idx') || message.includes('duplicate')) {
      return { success: false as const, error: 'Този имейл вече е поканен.' };
    }
    return { success: false as const, error: message || 'Поканата не беше записана.' };
  }
}
