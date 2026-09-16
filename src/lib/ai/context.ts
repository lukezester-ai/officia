import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { VAT_SALES_STATUSES } from '@/lib/tax/vat-period';

export async function buildRichContext(tenantId: string, userId: string): Promise<string> {
  const currentDate = new Date().toISOString();
  if (!tenantId) {
    return `Текуща дата: ${currentDate}\nЛипсва tenant контекст.`;
  }

  const [sales] = await db
    .select({
      count: sql<number>`count(*)`,
      unpaid: sql<number>`count(*) filter (where ${invoices.status} = 'issued')`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        inArray(invoices.status, [...VAT_SALES_STATUSES]),
      ),
    );

  const [purchases] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.tenantId, tenantId));

  return `
Текуща дата: ${currentDate}
Tenant ID: ${tenantId}
User ID: ${userId}

Бизнес контекст (реални данни):
- Издадени/платени продажбени фактури: ${Number(sales?.count || 0)}
- Неплатени издадени фактури: ${Number(sales?.unpaid || 0)}
- Покупни фактури: ${Number(purchases?.count || 0)}
- Основна валута: EUR

Допълнителни насоки:
Всички финансови операции трябва да бъдат съобразени със счетоводните стандарти в България.
Не измисляй салда, номера на фактури или суми, които не идват от инструментите.
`;
}
