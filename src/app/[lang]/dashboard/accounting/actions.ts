'use server';

import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
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

    const lines =
      headers.length > 0
        ? await db
            .select()
            .from(journalLines)
            .where(inArray(journalLines.journalId, headers.map((h) => h.id)))
        : [];

    const pendingItems = await getPendingAccountingItems(tenantId, lang);

    return {
      success: true,
      data: {
        headers,
        lines,
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
    const { tenantId } = await requireTenant();
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
