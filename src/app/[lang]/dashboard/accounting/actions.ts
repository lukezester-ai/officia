'use server';

import { db } from '@/lib/db/db';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { requirePermission } from '@/lib/auth/rbac';
import {
  getPendingAccountingItems,
  postPurchaseInvoiceToJournal,
  postSalesInvoiceToJournal,
  type InvoicePostingSource,
} from '@/lib/accounting/post-invoice';

export async function getAccountingData(lang: string) {
  try {
    const { tenantId } = await requireTenant();

    const headers = await db
      .select()
      .from(journalHeaders)
      .where(eq(journalHeaders.tenantId, tenantId))
      .orderBy(desc(journalHeaders.entryDate));

    const pendingItems = await getPendingAccountingItems(tenantId, lang);

    return {
      success: true,
      data: {
        headers,
        pendingItems,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function postPendingInvoice(input: {
  source: InvoicePostingSource;
  invoiceId: string;
  lang: string;
}) {
  try {
    const { tenantId, user } = await requireTenant();
    const gate = await requirePermission(tenantId, user.id, 'journal:create');
    if (!gate.ok) return { success: false as const, error: gate.error };

    const result =
      input.source === 'sales_invoice'
        ? await postSalesInvoiceToJournal(tenantId, user.id, Number(input.invoiceId))
        : await postPurchaseInvoiceToJournal(tenantId, user.id, input.invoiceId);

    if (!result.success) {
      return result;
    }

    revalidatePath(`/${input.lang}/dashboard/accounting`);
    revalidatePath(`/${input.lang}/dashboard`);
    return {
      success: true as const,
      journalHeaderId: result.journalHeaderId,
      journalNumber: result.journalNumber,
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? 'Грешка при осчетоводяване' };
  }
}

export async function confirmJournalEntry(id: string) {
  try {
    const { tenantId, user } = await requireTenant();
    const gate = await requirePermission(tenantId, user.id, 'journal:create');
    if (!gate.ok) return { success: false, error: gate.error };
    await db
      .update(journalHeaders)
      .set({ status: 'posted', aiStatus: 'verified' })
      .where(and(eq(journalHeaders.id, id), eq(journalHeaders.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
