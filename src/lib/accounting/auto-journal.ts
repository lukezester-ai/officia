// @ts-nocheck
import { db } from '@/lib/db/db';
import { invoices, invoiceLines } from '@/lib/db/schema/invoices';
import { purchaseInvoices, purchaseInvoiceLines } from '@/lib/db/schema/purchase-invoices';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { eq } from 'drizzle-orm';

/**
 * Ensures a double-entry journal entry is created in Счетоводство when an Invoice (Е-фактура / Одобрена) is issued.
 */
export async function ensureAutoJournalForInvoice(invoiceId: string, tenantId: string): Promise<{ success: boolean; journalId?: string; error?: string }> {
  try {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return { success: false, error: 'Фактурата не е намерена' };

    // Check if journal header already exists for this invoice
    const [existing] = await db.select().from(journalHeaders).where(eq(journalHeaders.documentId, invoiceId));
    if (existing) {
      return { success: true, journalId: existing.id };
    }

    // Fetch accounts or use fallback UUIDs if needed, or lookup from accountPlan table
    const accounts = await db.select().from(accountPlan).where(eq(accountPlan.tenantId, tenantId));
    const findOrCreateAccount = async (code: string, name: string, type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') => {
      const found = accounts.find(a => a.code === code);
      if (found) return found.id;
      const [created] = await db.insert(accountPlan).values({
        tenantId,
        code,
        name,
        type,
        isActive: true,
      }).returning();
      return created.id;
    };

    const acc411 = await findOrCreateAccount('411', 'Клиенти (Вземания по продажби)', 'asset');
    const acc701 = await findOrCreateAccount('701', 'Приходи от продажби на услуги и стоки', 'revenue');
    const acc4532 = await findOrCreateAccount('4532', 'Начислен ДДС за продажбите', 'liability');

    const journalNumber = `J-INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
    const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();

    const [header] = await db.insert(journalHeaders).values({
      tenantId,
      journalNumber,
      entryDate: issueDate,
      description: `Изходяща фактура № ${invoice.invoiceNumber} към ${invoice.counterpartyName}`,
      documentType: 'sales_invoice',
      documentId: invoiceId,
      status: 'posted',
      createdAt: new Date(),
    }).returning();

    const net = parseFloat(invoice.netAmount || '0') || 0;
    const vat = parseFloat(invoice.vatAmount || '0') || 0;
    const total = parseFloat(invoice.totalAmount || '0') || (net + vat);

    const linesToInsert = [
      // DR 411 - Вземане от клиент (Total)
      {
        journalId: header.id,
        accountId: acc411,
        entryType: 'debit',
        amount: total.toFixed(2),
        analyticalCode: invoice.counterpartyEik || invoice.counterpartyName,
        description: `Вземане от клиент: ${invoice.counterpartyName}`,
      },
      // CR 701 - Приход от продажба (Net)
      {
        journalId: header.id,
        accountId: acc701,
        entryType: 'credit',
        amount: net.toFixed(2),
        analyticalCode: invoice.counterpartyEik || invoice.counterpartyName,
        description: `Приход по фактура № ${invoice.invoiceNumber}`,
      }
    ];

    if (vat > 0) {
      linesToInsert.push({
        journalId: header.id,
        accountId: acc4532,
        entryType: 'credit',
        amount: vat.toFixed(2),
        analyticalCode: invoice.counterpartyEik || invoice.counterpartyName,
        description: `20% ДДС по фактура № ${invoice.invoiceNumber}`,
      });
    }

    await db.insert(journalLines).values(linesToInsert);

    return { success: true, journalId: header.id };
  } catch (error: any) {
    console.error('[ensureAutoJournalForInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensures a double-entry journal entry is created in Счетоводство when a Purchase Invoice is approved.
 */
export async function ensureAutoJournalForPurchaseInvoice(purchaseInvoiceId: string, tenantId: string): Promise<{ success: boolean; journalId?: string; error?: string }> {
  try {
    const [purchase] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, purchaseInvoiceId));
    if (!purchase) return { success: false, error: 'Фактурата за покупка не е намерена' };

    const [existing] = await db.select().from(journalHeaders).where(eq(journalHeaders.documentId, purchaseInvoiceId));
    if (existing) {
      return { success: true, journalId: existing.id };
    }

    const accounts = await db.select().from(accountPlan).where(eq(accountPlan.tenantId, tenantId));
    const findOrCreateAccount = async (code: string, name: string, type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') => {
      const found = accounts.find(a => a.code === code);
      if (found) return found.id;
      const [created] = await db.insert(accountPlan).values({
        tenantId,
        code,
        name,
        type,
        isActive: true,
      }).returning();
      return created.id;
    };

    const acc601 = await findOrCreateAccount('601', 'Разходи за външни услуги и материали', 'expense');
    const acc4531 = await findOrCreateAccount('4531', 'Начислен ДДС за покупки (Данъчен кредит)', 'asset');
    const acc401 = await findOrCreateAccount('401', 'Доставчици (Задължения)', 'liability');

    const journalNumber = `J-PUR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
    const issueDate = purchase.issueDate ? new Date(purchase.issueDate) : new Date();

    const [header] = await db.insert(journalHeaders).values({
      tenantId,
      journalNumber,
      entryDate: issueDate,
      description: `Входяща фактура № ${purchase.invoiceNumber} от ${purchase.supplierName}`,
      documentType: 'purchase_invoice',
      documentId: purchaseInvoiceId,
      status: 'posted',
      createdAt: new Date(),
    }).returning();

    const net = parseFloat(purchase.netAmount || '0') || 0;
    const vat = parseFloat(purchase.vatAmount || '0') || 0;
    const total = parseFloat(purchase.totalAmount || '0') || (net + vat);

    const linesToInsert = [
      // DR 601 - Разход (Net)
      {
        journalId: header.id,
        accountId: acc601,
        entryType: 'debit',
        amount: net.toFixed(2),
        analyticalCode: purchase.supplierEik || purchase.supplierName,
        description: `Разход по фактура № ${purchase.invoiceNumber}`,
      },
      // CR 401 - Задължение към доставчик (Total)
      {
        journalId: header.id,
        accountId: acc401,
        entryType: 'credit',
        amount: total.toFixed(2),
        analyticalCode: purchase.supplierEik || purchase.supplierName,
        description: `Задължение към доставчик: ${purchase.supplierName}`,
      }
    ];

    if (vat > 0) {
      linesToInsert.push({
        journalId: header.id,
        accountId: acc4531,
        entryType: 'debit',
        amount: vat.toFixed(2),
        analyticalCode: purchase.supplierEik || purchase.supplierName,
        description: `ДДС за ползване на данъчен кредит: № ${purchase.invoiceNumber}`,
      });
    }

    await db.insert(journalLines).values(linesToInsert);

    return { success: true, journalId: header.id };
  } catch (error: any) {
    console.error('[ensureAutoJournalForPurchaseInvoice] Error:', error);
    return { success: false, error: error.message };
  }
}
