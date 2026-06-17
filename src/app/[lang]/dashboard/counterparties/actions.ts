'use server';

import { db } from '@/lib/db/db';
import { counterparties } from '@/lib/db/schema/counterparties';
import { tenants } from '@/lib/db/schema/tenants';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function getTenant() {
  const [tenant] = await db.select().from(tenants).limit(1);
  return tenant;
}

export async function getCounterparties() {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant', data: [] };
    const data = await db.select().from(counterparties)
      .where(eq(counterparties.tenantId, tenant.id))
      .orderBy(desc(counterparties.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createCounterparty(input: {
  type: string;
  name: string;
  eik?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
}) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };
    const [entry] = await db.insert(counterparties).values({
      tenantId: tenant.id,
      type: input.type,
      name: input.name,
      eik: input.eik || null,
      vatNumber: input.vatNumber || null,
      address: input.address || null,
      city: input.city || null,
      email: input.email || null,
      phone: input.phone || null,
      contactPerson: input.contactPerson || null,
      notes: input.notes || null,
      isActive: true,
    }).returning();
    revalidatePath('/', 'layout');
    return { success: true, data: entry };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCounterparty(id: string, input: {
  type?: string;
  name?: string;
  eik?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
}) {
  try {
    await db.update(counterparties).set(input).where(eq(counterparties.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deactivateCounterparty(id: string) {
  try {
    await db.update(counterparties)
      .set({ isActive: false })
      .where(eq(counterparties.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}