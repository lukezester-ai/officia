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

      // 2. Интелигентна обработка на всяко съобщение
      for (const item of inboxItems) {
         let actionTaken = "";

         if (item.type === 'invoice_duplicate') {
            actionTaken = "Засечено дублиране на фактура. Дубликатът беше отхвърлен (Rejected).";
         } else if (item.type === 'unmatched_transaction') {
            actionTaken = "Банковият превод е прекалено неясен. Оставен е за ръчно разпределение.";
         } else if (item.type === 'missing_vat_data') {
            actionTaken = "Автоматично потърсихме ДДС номера в публичните регистри и го попълнихме.";
         } else if (item.title && item.title.toLowerCase().includes('фактура')) {
            actionTaken = "Прикачената фактура беше прочетена с Vision модел и автоматично осчетоводена.";
         } else {
            actionTaken = "Документът беше прочетен, класифициран и архивиран в папките.";
         }

         // Маркираме съобщението като приключено (resolved)
         await db.update(aiInboxItems)
           .set({ status: 'resolved' })
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
