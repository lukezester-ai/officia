'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { and, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function generateMorningBriefing() {
  try {
    const { tenantId } = await requireTenant();

    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    const outstandingInvoices = allInvoices.filter(i => i.status === 'issued' || i.status === 'sent' || i.status === 'overdue');
    const totalOutstanding = outstandingInvoices.reduce((acc, inv) => acc + getInvoiceEffectiveAmount(inv), 0);

    const pendingLeaves = await db.select().from(leaveRequests).where(and(
      eq(leaveRequests.tenantId, tenantId),
      eq(leaveRequests.status, 'pending'),
    ));

    const inboxItems = await db.select().from(aiInboxItems).where(and(
      eq(aiInboxItems.tenantId, tenantId),
      eq(aiInboxItems.status, 'open'),
    ));

    // Генериране на персонализиран AI текст
    const prompt = `Ти си Officia AI - проактивен бизнес асистент. 
Потребителят току-що отвори системата.
Ето текущото състояние на фирмата:
- Неплатени изходящи фактури: ${outstandingInvoices.length} бр. (общо: ${totalOutstanding.toFixed(2)} €)
- Чакащи молби за отпуск: ${pendingLeaves.length} бр.
- Непрочетени системни известия (Inbox): ${inboxItems.length} бр.

Напиши кратък, енергичен и приятелски сутрешен брифинг (до 3 изречения). 
Кажи му 'Добро утро' или 'Здравей'. 
Фокусирай вниманието му върху най-важното (напр. ако има много неплатени фактури, предложи да пратиш напомняния. Ако има чакащи отпуски, предложи да ги прегледаш). 
Не бъди скучен. Не споменавай нули (ако нещо е 0, просто не го споменавай).`;

    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-latest'),
      prompt: prompt,
    });

    return result.text;
  } catch (error) {
    console.error("Morning Briefing Error:", error);
    return "Здравей! Готов съм за работа. (Възникна лека грешка при зареждане на проактивните данни).";
  }
}
