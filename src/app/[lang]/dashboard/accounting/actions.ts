'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { tenants } from '@/lib/db/schema/tenants';
import { users } from '@/lib/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getInvoices() {
  try {
    const data = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(50);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createInvoice(invoiceData: any) {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    const [user] = await db.select().from(users).limit(1);
    if (!tenant || !user) return { success: false, error: 'Липсва конфигурация за компанията (Tenant)' };
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
    revalidatePath('/', 'layout');
    return { success: true, data: newInvoice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getJournalEntries() {
  try {
    const headers = await db.select().from(journalHeaders).orderBy(desc(journalHeaders.createdAt)).limit(50);
    return { success: true, data: headers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createJournalEntry(entryData: {
  description: string;
  entryDate: string;
  documentType?: string;
  lines: { accountId: string; entryType: 'debit' | 'credit'; amount: number; description?: string }[];
}) {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    const [user] = await db.select().from(users).limit(1);
    if (!tenant || !user) return { success: false, error: 'Липсва конфигурация за компанията' };

    const totalDebit = entryData.lines.filter(l => l.entryType === 'debit').reduce((s, l) => s + l.amount, 0);
    const totalCredit = entryData.lines.filter(l => l.entryType === 'credit').reduce((s, l) => s + l.amount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { success: false, error: `Дебит (${totalDebit.toFixed(2)}) ≠ Кредит (${totalCredit.toFixed(2)})` };
    }

    const year = new Date(entryData.entryDate).getFullYear();
    const count = await db.select().from(journalHeaders).where(eq(journalHeaders.tenantId, tenant.id));
    const seq = (count.length + 1).toString().padStart(5, '0');
    const journalNumber = `${year}-${seq}`;

    const [header] = await db.insert(journalHeaders).values({
      tenantId: tenant.id,
      journalNumber,
      entryDate: new Date(entryData.entryDate),
      description: entryData.description,
      documentType: entryData.documentType || 'manual',
      status: 'draft',
    }).returning();

    for (const line of entryData.lines) {
      await db.insert(journalLines).values({
        journalId: header.id,
        accountId: line.accountId,
        entryType: line.entryType,
        amount: line.amount.toString(),
        description: line.description || entryData.description,
      });
    }

    revalidatePath('/', 'layout');
    return { success: true, data: header };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function postJournalEntry(id: string) {
  try {
    await db.update(journalHeaders).set({ status: 'posted', postedAt: new Date() }).where(eq(journalHeaders.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLedgerLines() {
  try {
    const lines = await db.select().from(journalLines).orderBy(desc(journalLines.createdAt)).limit(100);
    return { success: true, data: lines };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAccountPlan() {
  try {
    const data = await db.select().from(accountPlan).orderBy(accountPlan.accountNumber);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function seedAccountPlan() {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant) return { success: false, error: 'Липсва Tenant' };

    const existing = await db.select().from(accountPlan).where(eq(accountPlan.tenantId, tenant.id));
    if (existing.length > 0) return { success: true, data: existing, message: 'Вече са заредени' };

    const nsuAccounts = [
      { accountNumber: '101', name: 'Земи', type: 'asset' },
      { accountNumber: '102', name: 'Сгради и конструкции', type: 'asset' },
      { accountNumber: '105', name: 'Машини и съоръжения', type: 'asset' },
      { accountNumber: '107', name: 'Транспортни средства', type: 'asset' },
      { accountNumber: '110', name: 'Офис оборудване и техника', type: 'asset' },
      { accountNumber: '113', name: 'Нематериални активи', type: 'asset' },
      { accountNumber: '201', name: 'Материали', type: 'asset' },
      { accountNumber: '211', name: 'Незавършено производство', type: 'asset' },
      { accountNumber: '221', name: 'Готова продукция', type: 'asset' },
      { accountNumber: '231', name: 'Стоки', type: 'asset' },
      { accountNumber: '241', name: 'Каса в лева', type: 'asset' },
      { accountNumber: '242', name: 'Каса във валута', type: 'asset' },
      { accountNumber: '243', name: 'Разплащателна сметка (BGN)', type: 'asset' },
      { accountNumber: '244', name: 'Разплащателна сметка (EUR)', type: 'asset' },
      { accountNumber: '301', name: 'Вземания от клиенти', type: 'asset' },
      { accountNumber: '302', name: 'Предоставени аванси на доставчици', type: 'asset' },
      { accountNumber: '311', name: 'Вземания по рекламации', type: 'asset' },
      { accountNumber: '321', name: 'Данък за възстановяване', type: 'asset' },
      { accountNumber: '401', name: 'Задължения към доставчици', type: 'liability' },
      { accountNumber: '402', name: 'Получени аванси от клиенти', type: 'liability' },
      { accountNumber: '411', name: 'Задължения към персонала', type: 'liability' },
      { accountNumber: '421', name: 'Задължения за данък общ доход', type: 'liability' },
      { accountNumber: '422', name: 'Задължения за ДОО/ЗО', type: 'liability' },
      { accountNumber: '431', name: 'Основен капитал', type: 'equity' },
      { accountNumber: '432', name: 'Резерви', type: 'equity' },
      { accountNumber: '433', name: 'Натрупана печалба/загуба', type: 'equity' },
      { accountNumber: '453', name: 'ДДС за внасяне (изход)', type: 'liability' },
      { accountNumber: '454', name: 'ДДС за прихващане (вход)', type: 'asset' },
      { accountNumber: '455', name: 'Разчети с НАП по ДДС', type: 'liability' },
      { accountNumber: '501', name: 'Приходи от продажба на продукция', type: 'income' },
      { accountNumber: '502', name: 'Приходи от продажба на стоки', type: 'income' },
      { accountNumber: '503', name: 'Приходи от услуги', type: 'income' },
      { accountNumber: '509', name: 'Други приходи от дейността', type: 'income' },
      { accountNumber: '511', name: 'Приходи от наеми', type: 'income' },
      { accountNumber: '521', name: 'Приходи от лихви', type: 'income' },
      { accountNumber: '601', name: 'Разходи за материали', type: 'expense' },
      { accountNumber: '602', name: 'Разходи за външни услуги', type: 'expense' },
      { accountNumber: '603', name: 'Разходи за амортизации', type: 'expense' },
      { accountNumber: '604', name: 'Разходи за заплати', type: 'expense' },
      { accountNumber: '605', name: 'Разходи за социални осигуровки', type: 'expense' },
      { accountNumber: '606', name: 'Разходи за данъци и такси', type: 'expense' },
      { accountNumber: '609', name: 'Други разходи', type: 'expense' },
      { accountNumber: '701', name: 'Себестойност на продажбите', type: 'expense' },
    ];

    const inserted = await db.insert(accountPlan).values(
      nsuAccounts.map(acc => ({
        tenantId: tenant.id,
        accountNumber: acc.accountNumber,
        name: acc.name,
        type: acc.type,
        isActive: true,
        standard: 'НСУ',
      }))
    ).returning();

    return { success: true, data: inserted, message: `Заредени ${inserted.length} сметки` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}