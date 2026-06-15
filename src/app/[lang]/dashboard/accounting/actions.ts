'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { tenants } from '@/lib/db/schema/tenants';
import { users } from '@/lib/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Fetch Invoices
export async function getInvoices() {
  try {
    const data = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(50);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return { success: false, error: error.message };
  }
}

// Create new Invoice
export async function createInvoice(invoiceData: any) {
  try {
    // Вземаме първия тенант и потребител за целите на демото
    const [tenant] = await db.select().from(tenants).limit(1);
    const [user] = await db.select().from(users).limit(1);

    if (!tenant || !user) {
      return { success: false, error: 'Липсва конфигурация за компанията (Tenant)' };
    }

    const [newInvoice] = await db.insert(invoices).values({
      tenantId: tenant.id,
      userId: user.id,
      invoiceNumber: invoiceData.invoiceNumber,
      clientName: invoiceData.clientName,
      amount: invoiceData.amount.toString(),
      issueDate: new Date(invoiceData.issueDate),
      dueDate: new Date(invoiceData.dueDate),
      status: invoiceData.status || 'draft',
    }).returning();

    revalidatePath('/', 'layout'); // Revalidate everything to ensure dashboard updates

    return { success: true, data: newInvoice };
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return { success: false, error: error.message };
  }
}

// Fetch Journal Entries
export async function getJournalEntries() {
  try {
    const headers = await db.select().from(journalHeaders).orderBy(desc(journalHeaders.createdAt)).limit(50);
    
    // В реално приложение ще join-нем journalLines за да вземем сумите и сметките
    // Тук правим прост мапинг за демото
    return { success: true, data: headers };
  } catch (error: any) {
    console.error('Error fetching journal entries:', error);
    return { success: false, error: error.message };
  }
}

// Fetch Ledger Data (aggregated lines)
export async function getLedgerLines() {
  try {
    const lines = await db.select().from(journalLines).orderBy(desc(journalLines.createdAt)).limit(100);
    return { success: true, data: lines };
  } catch (error: any) {
    console.error('Error fetching ledger lines:', error);
    return { success: false, error: error.message };
  }
}
