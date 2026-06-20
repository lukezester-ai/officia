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