'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function generateMorningBriefing() {
  try {
    const { userId, orgId } = await auth();
    const tenantId = orgId || userId;
    
    if (!tenantId) {
      return "Няма достъп.";
    }

    // Събиране на данни за AI
    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    const outstandingInvoices = allInvoices.filter(i => i.status === 'issued');
    const totalOutstanding = outstandingInvoices.reduce((acc, inv) => acc + parseFloat(inv.totalAmount || '0'), 0);

    const pendingLeaves = await db.select().from(leaveRequests).where(eq(leaveRequests.status, 'pending'));
    const pendingLeavesCount = pendingLeaves.filter(l => l.tenantId === tenantId).length;

    const inboxItems = await db.select().from(aiInboxItems).where(eq(aiInboxItems.tenantId, tenantId));
    const openInboxCount = inboxItems.filter(i => i.status === 'open').length;

    // Генериране на персонализиран AI текст
    const prompt = `Ти си Officia AI - проактивен бизнес асистент. 
Потребителят току-що отвори системата.
Ето текущото състояние на фирмата:
- Неплатени изходящи фактури: ${outstandingInvoices.length} бр. (общо: ${totalOutstanding.toFixed(2)} лв.)
- Чакащи молби за отпуск: ${pendingLeavesCount} бр.
- Непрочетени системни известия (Inbox): ${openInboxCount} бр.

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
