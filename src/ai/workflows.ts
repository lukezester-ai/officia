import { db } from '../lib/db';
import { aiInboxItems } from '../lib/db/schema/ai_inbox';
import { journalEntries } from '../lib/db/schema/journal_entries';
import { invoices } from '../lib/db/schema/invoices';
import { and, desc, eq } from 'drizzle-orm';
import { isUuid } from '../lib/utils/ids';

export async function generateJournalEntryFromOCR(ocrData: string) {
  const parsed = JSON.parse(ocrData);
  if (!isUuid(parsed.tenantId)) {
    throw new Error('OCR журнал изисква валиден tenantId.');
  }
  const [created] = await db.insert(journalEntries).values({
    tenantId: parsed.tenantId,
    journalNumber: `JRN-${Date.now()}`,
    entryDate: new Date(parsed.entryDate ?? Date.now()),
    description: parsed.description ?? 'OCR-generated entry',
    status: 'draft',
  }).returning();
  await db.insert(aiInboxItems).values({
    tenantId: parsed.tenantId,
    type: 'journal_entry',
    sourceType: 'journal',
    sourceId: String(created.id),
    title: created.journalNumber,
    metaJson: parsed,
  });
  return created;
}

export async function forecastCashFlow(tenantId: string, periods: number = 12): Promise<number[]> {
  if (!isUuid(tenantId)) throw new Error('Прогнозата изисква tenant.');
  const recent = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.issueDate))
    .limit(12);
  const amounts = recent.map((inv) => Number(inv.amount || inv.totalAmount || 0));
  const avg = amounts.reduce((a, b) => a + b, 0) / (amounts.length || 1);
  return Array.from({ length: periods }, () => avg);
}

export async function autoApprove(invoiceId: string): Promise<boolean> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice?.tenantId) return false;
  const vendorName = invoice.clientName ?? invoice.counterpartyName ?? '';
  const trustedVendors = ['Vendor A', 'Vendor B'];
  if (Number(invoice.amount) < 5000 && trustedVendors.includes(vendorName)) {
    await db.update(invoices).set({ status: 'approved' }).where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.tenantId, invoice.tenantId),
    ));
    await db.insert(aiInboxItems).values({
      tenantId: invoice.tenantId,
      type: 'approval',
      sourceType: 'invoice',
      sourceId: String(invoice.id),
      title: `Approval for invoice ${invoice.invoiceNumber}`,
      metaJson: { invoiceId, approved: true },
    });
    return true;
  }
  return false;
}
