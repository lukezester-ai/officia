// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { eq, and } from 'drizzle-orm';

export const buildProcessInboxTool = (tenantId: string) => tool({
  description: "AI Инбокс Процесор. Използвай го, когато потребителят те помоли да прочетеш пощата, да провериш съобщенията, да изчистиш инбокса или да обработиш автоматичните известия.",
  parameters: z.object({
     run: z.boolean().optional().describe("Трябва да е true за стартиране"),
  }),
  execute: async () => {
    try {
      // 1. Вземаме всички отворени известия (open)
      const inboxItems = await db.select().from(aiInboxItems).where(
        and(
           eq(aiInboxItems.tenantId, tenantId),
           eq(aiInboxItems.status, 'open')
        )
      );

      if (inboxItems.length === 0) {
         return { success: true, message: "📭 Инбоксът е празен. Няма нови документи, имейли или системни известия за обработка." };
      }

      let resolvedCount = 0;
      const details = [];

      // 2. Интелигентна обработка — НЕ затваряме human-approval заявки автоматично
      for (const item of inboxItems) {
         if (item.type === 'ai_approval_required') {
            details.push(`⏳ Одобрение: "${item.title}" — оставено за човешки преглед (използвай /api/ai/approvals).`);
            continue;
         }

         let actionTaken = "";
         let nextStatus = 'resolved';

         if (item.type === 'invoice_duplicate') {
            actionTaken = "Засечено дублиране на фактура. Маркирано за отхвърляне.";
            nextStatus = 'rejected';
         } else if (item.type === 'unmatched_transaction' || item.type === 'bank_match_suggested') {
            actionTaken = "Банковото съпоставяне изисква ръчно потвърждение — оставено отворено.";
            details.push(`🔎 Известие: "${item.title}"\n   ↳ Действие: ${actionTaken}`);
            continue;
         } else if (item.type === 'missing_vat_data') {
            actionTaken = "Липсващи ДДС данни — ескалирано с висок приоритет.";
            await db.update(aiInboxItems).set({ priority: 'high' }).where(eq(aiInboxItems.id, item.id));
            details.push(`⚠️ Известие: "${item.title}"\n   ↳ Действие: ${actionTaken}`);
            continue;
         } else if (item.type === 'document_pipeline_ready') {
            actionTaken = "Pipeline е завършил — документите са готови; сигналът е архивиран след преглед.";
         } else {
            actionTaken = "Класифицирано и архивирано.";
         }

         await db.update(aiInboxItems)
           .set({ status: nextStatus })
           .where(eq(aiInboxItems.id, item.id));

         resolvedCount++;
         details.push(`✅ Известие: "${item.title}"\n   ↳ Действие: ${actionTaken}`);
      }

      return {
         success: true,
         message: `AI Инбокс Процесорът приключи работа.\n\n📊 Обработени известия и мейли: ${resolvedCount}\n\nСправка:\n${details.join('\n\n')}`
      };

    } catch (err: any) {
      console.error("AI Inbox Error:", err);
      return { success: false, message: `Грешка при обработка на инбокса: ${err.message}` };
    }
  }
});
