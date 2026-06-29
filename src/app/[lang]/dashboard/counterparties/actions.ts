'use server';

import { db } from '@/lib/db/db';
import { counterparties } from '@/lib/db/schema/counterparties';
import { invoices } from '@/lib/db/schema/invoices';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { requireTenant } from '@/lib/auth/get-tenant';
import { and, eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getCounterparties() {
  try {
    const { tenantId } = await requireTenant();
    const data = await db.select().from(counterparties)
      .where(eq(counterparties.tenantId, tenantId))
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
    const { tenantId } = await requireTenant();
    const [entry] = await db.insert(counterparties).values({
      tenantId,
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
    const { tenantId } = await requireTenant();
    await db.update(counterparties).set(input).where(and(eq(counterparties.id, id), eq(counterparties.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deactivateCounterparty(id: string) {
  try {
    const { tenantId } = await requireTenant();
    await db.update(counterparties)
      .set({ isActive: false })
      .where(and(eq(counterparties.id, id), eq(counterparties.tenantId, tenantId)));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCounterparty360Data(id: string) {
  try {
    const { tenantId } = await requireTenant();
    const [counterparty] = await db.select().from(counterparties).where(and(eq(counterparties.id, id), eq(counterparties.tenantId, tenantId))).limit(1);
    if (!counterparty) return { success: false, error: 'Контрагентът не е намерен' };

    // Find invoices (match by counterpartyName, in real app match by ID if linked)
    // Wait, counterparties are linked to invoices by name or ID? Currently invoices just has counterpartyName. Let's match by name.
    const relatedInvoices = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.counterpartyName, counterparty.name)));
    
    // Financials
    const unpaidInvoices = relatedInvoices.filter(i => i.status === 'issued');
    const totalUnpaid = unpaidInvoices.reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
    const totalVolume = relatedInvoices.reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
    
    // Transactions
    const relatedTransactionRows = await db
      .select({ tx: bankTransactions })
      .from(bankTransactions)
      .innerJoin(bankAccounts, eq(bankTransactions.accountId, bankAccounts.id))
      .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankTransactions.counterpartyName, counterparty.name)));
    const relatedTransactions = relatedTransactionRows.map((row) => row.tx);
    
    // Documents
    // Since document schema doesn't have counterpartyName directly, we might search metadata or title
    // But for now, we'll return empty array or mock
    const relatedDocuments: any[] = [];

    // AI Notes logic
    const aiNotes = [];
    if (unpaidInvoices.length > 0) {
      aiNotes.push(`Контрагентът има ${unpaidInvoices.length} неплатени фактури за общо ${totalUnpaid.toLocaleString('bg-BG')} €`);
    }
    const overdue = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) < new Date());
    if (overdue.length > 0) {
      aiNotes.push(`ВНИМАНИЕ: ${overdue.length} от неплатените фактури са просрочени.`);
    }
    if (!counterparty.eik) {
      aiNotes.push('Липсва ЕИК. Препоръчително е да го въведете за коректно отчитане по ДДС.');
    }

    return { 
      success: true, 
      data: {
        counterparty,
        financials: {
          totalVolume,
          totalUnpaid,
          overdueCount: overdue.length
        },
        invoices: relatedInvoices,
        transactions: relatedTransactions,
        documents: relatedDocuments,
        aiNotes
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
