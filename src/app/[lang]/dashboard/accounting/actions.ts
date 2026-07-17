'use server';

import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getAccountingData() {
  try {
    const headers = await db.select().from(journalHeaders).orderBy(desc(journalHeaders.entryDate));
    const lines = headers.length > 0 ? await db.select().from(journalLines).where(inArray(journalLines.journalId, headers.map(h => h.id))) : [];
    
    // For "Чакат осчетоводяване", we fetch invoices that are not paid or fully accounted
    const pendingInvoices = await db.select().from(invoices).where(eq(invoices.status, 'issued'));

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
    await db.update(journalHeaders).set({ status: 'posted', aiStatus: 'verified' }).where(eq(journalHeaders.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function postInvoiceToJournal(invoiceId: string, accountCode: string = '411') {
  try {
    const { requireTenant } = await import('@/lib/auth/get-tenant');
    const { tenantId } = await requireTenant();
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId as any)).limit(1);
    if (!inv) return { success: false, error: 'Фактурата не е намерена' };

    const [header] = await db.insert(journalHeaders).values({
      tenantId,
      entryNumber: `J-${inv.invoiceNumber || Date.now()}`,
      entryDate: inv.issueDate || new Date().toISOString().split('T')[0],
      documentReference: `Фактура № ${inv.invoiceNumber}`,
      counterpartyName: inv.clientName || 'Неизвестен клиент',
      description: `Продажба по фактура № ${inv.invoiceNumber}`,
      status: 'posted',
      aiStatus: 'verified',
    } as any).returning();

    await db.update(invoices).set({ status: 'accounted' } as any).where(eq(invoices.id, invoiceId as any));
    revalidatePath('/', 'layout');
    return { success: true, data: header };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { runLedgerAudit, AuditReportResult } from '@/lib/ai/audit/ledger-audit';

/**
 * TICKET 8: Стартира автоматизиран AI-базиран одит на счетоводната главна книга,
 * проверка за разбалансирани статии, дублирани фактури и грешки в ДДС.
 */
export async function runAiLedgerAuditAction(): Promise<AuditReportResult> {
  return await runLedgerAudit();
}