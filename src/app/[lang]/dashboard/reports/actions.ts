'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getReportsData() {
  try {
    const { tenantId } = await requireTenant();
    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));

    const revenue = allInvoices.filter(i => i.type === 'sale').reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
    const expenses = allInvoices.filter(i => i.type === 'purchase').reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
    
    const unpaidSales = allInvoices.filter(i => i.type === 'sale' && i.status === 'issued');
    const unpaidPurchases = allInvoices.filter(i => i.type === 'purchase' && i.status === 'issued');

    const totalUnpaidSales = unpaidSales.reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);
    const totalUnpaidPurchases = unpaidPurchases.reduce((sum, i) => sum + parseFloat(i.totalAmount || '0'), 0);

    const overdueCount = unpaidSales.filter(i => i.dueDate && new Date(i.dueDate) < new Date()).length;

    // AI CFO Copilot mock response based on metrics
    let cfoSummary = "Финансовото състояние е стабилно. ";
    if (expenses > revenue) {
      cfoSummary = "Внимание: Разходите надвишават приходите този месец. Препоръчва се преглед на основните пера.";
    } else if (overdueCount > 0) {
      cfoSummary = `Имате ${overdueCount} просрочени изходящи фактури. Приоритетно насочете усилия към събирането им, за да запазите ликвидността.`;
    }

    const cfoInsights = [
      { type: 'risk', text: 'Разходите за "Външни услуги" са нараснали с 15% спрямо миналия месец.' },
      { type: 'opportunity', text: 'Времето за плащане от клиенти е средно 12 дни, което е отлично.' },
      { type: 'alert', text: `Имате ${unpaidPurchases.length} неплатени фактури към доставчици, чакащи одобрение.` }
    ];

    return { 
      success: true, 
      data: {
        revenue,
        expenses,
        profit: revenue - expenses,
        totalUnpaidSales,
        totalUnpaidPurchases,
        overdueCount,
        cfoSummary,
        cfoInsights
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
