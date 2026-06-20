'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { eq, desc } from 'drizzle-orm';

export async function getVatData() {
  try {
    const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.issueDate));
    
    // We will separate them into purchases (incoming) and sales (outgoing)
    const purchases = allInvoices.filter(i => i.type === 'purchase');
    const sales = allInvoices.filter(i => i.type === 'sale');

    // Calculate totals
    const totalVatPurchases = purchases.reduce((sum, i) => sum + parseFloat(i.vatAmount || '0'), 0);
    const totalVatSales = sales.reduce((sum, i) => sum + parseFloat(i.vatAmount || '0'), 0);

    const netVat = totalVatSales - totalVatPurchases; // If > 0, to pay. If < 0, to refund.

    // AI Auditor Logic - find problems
    const problems = [];
    
    for (const inv of allInvoices) {
      if (parseFloat(inv.vatAmount || '0') > 0 && !inv.counterpartyEik) {
        problems.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          counterpartyName: inv.counterpartyName,
          issue: 'Начислено ДДС, но липсва ЕИК на контрагента.'
        });
      }
    }

    return { 
      success: true, 
      data: {
        purchases,
        sales,
        kpi: {
          totalVatPurchases,
          totalVatSales,
          netVat
        },
        problems
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
