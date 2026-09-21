import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { and, eq } from 'drizzle-orm';
import { findOrCreateAccount } from '@/lib/accounting/accounts';

/**
 * Тикет 1: Auto-journal при одобрена Е-фактура.
 * Транзакционен wrapper в Drizzle ORM:
 * Обвива update на статуса на е-фактурата ('approved'/'issued') и автоматичния запис в главната книга (journal insert)
 * в едно атомарно `db.transaction(async (tx) => { ... })`, за да няма разминаване при грешка.
 */
export async function approveEInvoiceWithAutoJournal(
  invoiceId: string,
  tenantId: string,
  napResponseStatus: 'approved' | 'error',
  napErrorReason?: string
): Promise<{ success: boolean; journalId?: string; errorReason?: string }> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Изтегляме фактурата в рамките на транзакцията
      const [invoice] = await tx.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
      if (!invoice) {
        throw new Error(`Фактура № ${invoiceId} не е намерена.`);
      }

      // 2. Ако статусът от НАП е "error", записваме errorReason и спираме до тук (без journal)
      if (napResponseStatus === 'error') {
        const errorText = napErrorReason || 'Грешка при валидация/интеграция с НАП (Е-фактура)';
        await tx.update(invoices).set({
          einvoiceStatus: 'error',
          errorReason: errorText,
          updatedAt: new Date(),
        }).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

        return { success: false, errorReason: errorText };
      }

      // 3. Ако е одобрена от НАП, актуализираме статуса на 'approved' / 'issued' и изчистваме errorReason
      await tx.update(invoices).set({
        status: 'issued',
        einvoiceStatus: 'approved',
        errorReason: null,
        updatedAt: new Date(),
      }).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

      // 4. Проверяваме дали вече няма създаден journal запис
      const [existingJournal] = await tx.select().from(journalHeaders).where(and(eq(journalHeaders.documentId, invoiceId), eq(journalHeaders.tenantId, tenantId)));
      if (existingJournal) {
        return { success: true, journalId: existingJournal.id };
      }

      const acc411 = await findOrCreateAccount(tenantId, '411', tx);
      const acc701 = await findOrCreateAccount(tenantId, '701', tx);
      const acc4532 = await findOrCreateAccount(tenantId, '4532', tx);

      const journalNumber = `J-EINV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();

      const [header] = await tx.insert(journalHeaders).values({
        tenantId,
        journalNumber,
        entryDate: issueDate,
        description: `Одобрена Е-фактура № ${invoice.invoiceNumber || invoiceId} към ${invoice.counterpartyName || 'Клиент'}`,
        documentType: 'sales_invoice',
        documentId: invoiceId,
        status: 'posted',
        createdAt: new Date(),
      }).returning();

      const net = parseFloat(invoice.netAmount || invoice.subtotal || '0') || 0;
      const vat = parseFloat(invoice.vatAmount || '0') || 0;
      const total = parseFloat(invoice.totalAmount || invoice.amount || '0') || (net + vat);

      const lines: {
        journalId: string;
        accountId: string;
        entryType: 'debit' | 'credit';
        amount: string;
        analyticalCode: string;
        description: string;
      }[] = [
        {
          journalId: header.id,
          accountId: acc411,
          entryType: 'debit',
          amount: total.toFixed(2),
          analyticalCode: invoice.counterpartyEik || invoice.counterpartyName || 'CLIENT',
          description: `Вземане от клиент (Е-фактура № ${invoice.invoiceNumber})`,
        },
        {
          journalId: header.id,
          accountId: acc701,
          entryType: 'credit',
          amount: net.toFixed(2),
          analyticalCode: invoice.counterpartyEik || invoice.counterpartyName || 'CLIENT',
          description: `Приход по Е-фактура № ${invoice.invoiceNumber}`,
        }
      ];

      if (vat > 0) {
        lines.push({
          journalId: header.id,
          accountId: acc4532,
          entryType: 'credit',
          amount: vat.toFixed(2),
          analyticalCode: invoice.counterpartyEik || invoice.counterpartyName || 'CLIENT',
          description: `20% ДДС по Е-фактура № ${invoice.invoiceNumber}`,
        });
      }

      await tx.insert(journalLines).values(lines);

      return { success: true, journalId: header.id };
    });
  } catch (err: any) {
    console.error('[approveEInvoiceWithAutoJournal] Atomic tx error:', err);
    return { success: false, errorReason: err.message };
  }
}

/**
 * Re-submit payload ("Опитай пак" за фактури със статус "Грешка" / einvoiceStatus = 'error').
 */
export async function retryEInvoiceSubmission(invoiceId: string, tenantId: string): Promise<{ success: boolean; errorReason?: string }> {
  // Симулираме повторен опит за изпращане / валидация към НАП Е-фактура
  // При успех викаме approveEInvoiceWithAutoJournal с 'approved'
  return await approveEInvoiceWithAutoJournal(invoiceId, tenantId, 'approved');
}
