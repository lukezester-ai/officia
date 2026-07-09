import { db } from '../db/db';
import { invoices } from '../db/schema/invoices';
import { aiInboxItems } from '../db/schema/ai_inbox';
import { eq, and, ne } from 'drizzle-orm';

export async function runReviewEngineForInvoice(invoiceId: string | number) {
  try {
    const id = typeof invoiceId === 'string' ? Number(invoiceId) : invoiceId;
    if (isNaN(id)) return;
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return;

    let aiStatus = null;

    // 1. Check for duplicates
    // We look for other invoices with same counterparty, same amount, same date
    if (inv.counterpartyName && inv.totalAmount) {
      const duplicates = await db.select().from(invoices)
        .where(
          and(
            eq(invoices.counterpartyName, inv.counterpartyName),
            eq(invoices.totalAmount, inv.totalAmount),
            ne(invoices.id, inv.id)
          )
        );
      
      if (duplicates.length > 0) {
        aiStatus = 'duplicate_suspected';
        // Create an inbox item
        await db.insert(aiInboxItems).values({
          tenantId: inv.tenantId || '',
          type: 'duplicate_warning',
          title: `Възможен дубликат: Фактура ${inv.invoiceNumber}`,
          description: `Открито е съвпадение по сума и контрагент с друга фактура (${duplicates[0].invoiceNumber}).`,
          sourceId: String(inv.id),
          sourceType: 'invoice',
          status: 'open',
          priority: 'high'
        });
      }
    }

    // 2. Missing VAT/EIK
    if (!aiStatus && !inv.counterpartyEik) {
      aiStatus = 'needs_review';
      await db.insert(aiInboxItems).values({
        tenantId: inv.tenantId || '',
        type: 'missing_data',
        title: `Липсващ ЕИК за фактура ${inv.invoiceNumber}`,
        description: `Задължително е въвеждането на ЕИК за коректно отчитане по ДДС.`,
        sourceId: String(inv.id),
        sourceType: 'invoice',
        status: 'open',
        priority: 'medium'
      });
    }

    if (aiStatus) {
      await db.update(invoices).set({ aiStatus }).where(eq(invoices.id, id));
    }

  } catch (e) {
    console.error('Review Engine Error:', e);
  }
}
