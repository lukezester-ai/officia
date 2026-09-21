'use server';

import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { invoices } from '@/lib/db/schema/invoices';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { ensureAutoJournalForInvoice } from '@/lib/accounting/auto-journal';
import { runLedgerAudit, AuditReportResult } from '@/lib/ai/audit/ledger-audit';

export async function getAccountingData() {
  try {
    const { tenantId } = await requireTenant();
    const headers = await db.select().from(journalHeaders).where(eq(journalHeaders.tenantId, tenantId)).orderBy(desc(journalHeaders.entryDate));
    const lines = headers.length > 0
      ? await db.select().from(journalLines).where(inArray(journalLines.journalId, headers.map(h => h.id)))
      : [];
    const pendingInvoices = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'issued')));

    return {
      success: true,
      data: {
        headers,
        lines,
        pendingInvoices
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function confirmJournalEntry(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await db.update(journalHeaders).set({ status: 'posted', aiStatus: 'verified' }).where(and(eq(journalHeaders.id, id), eq(journalHeaders.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function postInvoiceToJournal(invoiceId: string, _accountCode?: string) {
  try {
    const { tenantId } = await requireTenant();
    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId))).limit(1);
    if (!inv) return { success: false, error: 'Фактурата не е намерена' };
    return ensureAutoJournalForInvoice(invoiceId, tenantId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runAiLedgerAuditAction(): Promise<AuditReportResult> {
  return await runLedgerAudit();
}
