'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, or, and, desc } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { revalidatePath } from 'next/cache';

/**
 * ЕПИК 5: Взимане на чакащите фактури за мобилно одобрение.
 */
export async function getPendingApprovals() {
  try {
    const { tenantId } = await requireTenant();
    if (!tenantId) throw new Error('Неоторизиран достъп');

    const pending = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      counterpartyName: invoices.counterpartyName,
      issueDate: invoices.issueDate,
      totalAmount: invoices.totalAmount,
      type: invoices.type,
      einvoiceStatus: invoices.einvoiceStatus,
      reviewStatus: invoices.reviewStatus,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        or(
          eq(invoices.einvoiceStatus, 'pending'),
          eq(invoices.reviewStatus, 'pending')
        )
      )
    )
    .orderBy(desc(invoices.createdAt))
    .limit(20);

    return { success: true, data: pending };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ЕПИК 5: Одобряване на фактура
 */
export async function approveInvoice(id: number) {
  try {
    const { tenantId } = await requireTenant();
    if (!tenantId) throw new Error('Неоторизиран достъп');

    // Маркираме като одобрени и двата статуса за сигурност
    await db.update(invoices)
      .set({ 
        reviewStatus: 'reviewed', 
        einvoiceStatus: 'approved',
        status: 'approved',
        updatedAt: new Date()
      })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));

    revalidatePath('/bg/mobile/approvals');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ЕПИК 5: Отхвърляне на фактура
 */
export async function rejectInvoice(id: number, reason: string = 'Отхвърлена от управител') {
  try {
    const { tenantId } = await requireTenant();
    if (!tenantId) throw new Error('Неоторизиран достъп');

    await db.update(invoices)
      .set({ 
        reviewStatus: 'rejected', 
        einvoiceStatus: 'rejected',
        errorReason: reason,
        status: 'draft',
        updatedAt: new Date()
      })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));

    revalidatePath('/bg/mobile/approvals');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
