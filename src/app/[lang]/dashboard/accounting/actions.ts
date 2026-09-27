'use server';

import { db } from '@/lib/db/db';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { invoices } from '@/lib/db/schema/invoices';
import { tasks } from '@/lib/db/schema/tasks';
import { and, eq, desc, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { parseUuidParam } from '@/lib/utils/ids';
import { ensureAutoJournalForInvoice } from '@/lib/accounting/auto-journal';
import { runLedgerAudit, AuditReportResult } from '@/lib/ai/audit/ledger-audit';

export async function getAccountingData() {
  try {
    const { tenantId } = await requireTenant();
    const headers = await db.select().from(journalHeaders).where(eq(journalHeaders.tenantId, tenantId)).orderBy(desc(journalHeaders.entryDate));
    const lines = headers.length > 0
      ? await db.select().from(journalLines).where(inArray(journalLines.journalId, headers.map(h => h.id)))
      : [];
    const accountIds = [...new Set(lines.map((line) => line.accountId).filter(Boolean))];
    const accounts = accountIds.length > 0
      ? await db.select({
          id: accountPlan.id,
          accountNumber: accountPlan.accountNumber,
          name: accountPlan.name,
        }).from(accountPlan).where(and(eq(accountPlan.tenantId, tenantId), inArray(accountPlan.id, accountIds)))
      : [];
    const pendingInvoices = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'issued')));

    return {
      success: true,
      data: {
        headers,
        lines,
        accounts,
        pendingInvoices
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reviewJournalEntry(id: string) {
  try {
    const { tenantId } = await requireTenant();
    const journalId = parseUuidParam(id);
    if (!journalId) return { success: false as const, error: 'Невалиден запис.' };

    const [header] = await db.select().from(journalHeaders)
      .where(and(eq(journalHeaders.id, journalId), eq(journalHeaders.tenantId, tenantId)))
      .limit(1);
    if (!header) return { success: false as const, error: 'Записът не е намерен.' };

    const lines = await db.select().from(journalLines).where(eq(journalLines.journalId, header.id));
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      const amount = parseFloat(line.amount || '0') || 0;
      if (line.entryType === 'debit') debit += amount;
      if (line.entryType === 'credit') credit += amount;
    }
    const reasoning = `Прегледано. Дебит ${debit.toFixed(2)} €, кредит ${credit.toFixed(2)} €.`;

    if (header.status === 'posted') {
      const title = `Прегледай статия ${header.journalNumber}`.slice(0, 200);
      const [existing] = await db.select({ id: tasks.id }).from(tasks).where(and(
        eq(tasks.tenantId, tenantId),
        eq(tasks.title, title),
        eq(tasks.status, 'suggested'),
      )).limit(1);
      if (existing) return { success: true as const, already: true, posted: true };

      await db.insert(tasks).values({
        tenantId,
        title,
        description: header.description ? `${reasoning} ${header.description}` : reasoning,
        status: 'suggested',
        priority: 'high',
      });
      revalidatePath('/', 'layout');
      return { success: true as const, already: false, posted: true };
    }

    const updated = await db.update(journalHeaders).set({
      aiStatus: 'verified',
      aiReasoning: reasoning,
    }).where(and(
      eq(journalHeaders.id, header.id),
      eq(journalHeaders.tenantId, tenantId),
      ne(journalHeaders.status, 'posted'),
    )).returning({ id: journalHeaders.id });
    if (!updated.length) return { success: false as const, error: 'Записът не беше обновен.' };

    revalidatePath('/', 'layout');
    return { success: true as const, already: false, posted: false };
  } catch (error: any) {
    return { success: false as const, error: error.message };
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
