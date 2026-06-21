// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { eq, and, sql } from 'drizzle-orm';

export const buildAutoApproveTool = (tenantId: string, userId: string) => tool({
  description: "Автоматичен HR Мениджър. Сканира чакащите молби за отпуска, проверява за конфликти (застъпващи се отпуски в същия отдел) и автоматично ги одобрява, ако няма проблем. Използвай го, когато потребителят иска да разгледа/одобри молбите за отпуск.",
  parameters: z.object({
     run: z.boolean().optional().describe("Трябва да е true за стартиране"),
  }),
  execute: async () => {
    try {
      // 1. Вземаме всички чакащи молби заедно с данните за служителя
      const pendingRequests = await db.select({
         id: leaveRequests.id,
         startDate: leaveRequests.startDate,
         endDate: leaveRequests.endDate,
         employeeId: leaveRequests.employeeId,
         firstName: employees.firstName,
         lastName: employees.lastName,
         department: employees.department
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(
         and(
           eq(leaveRequests.tenantId, tenantId),
           eq(leaveRequests.status, 'pending')
         )
      );

      if (pendingRequests.length === 0) {
         return { success: true, message: "В момента няма чакащи молби за отпуска за разглеждане." };
      }

      let approvedCount = 0;
      let skippedCount = 0;
      const details = [];

      for (const req of pendingRequests) {
         if (!req.department) {
            skippedCount++;
            details.push(`⚠️ Пропусната: ${req.firstName} ${req.lastName} няма зададен отдел в профила си.`);
            continue;
         }

         // 2. Търсим ОДОБРЕНИ отпуски в СЪЩИЯ отдел, които се ЗАСТЪПВАТ с тези дати
         const conflicting = await db.select()
           .from(leaveRequests)
           .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
           .where(
              and(
                eq(leaveRequests.tenantId, tenantId),
                eq(leaveRequests.status, 'approved'),
                eq(employees.department, req.department),
                // Логика за застъпване на периоди: StartA <= EndB AND EndA >= StartB
                sql`${leaveRequests.startDate} <= ${req.endDate}`,
                sql`${leaveRequests.endDate} >= ${req.startDate}`
              )
           );

         if (conflicting.length > 0) {
            // Има конфликт - някой друг от същия отдел вече е в отпуска тогава.
            // Оставяме молбата Pending за ръчно одобрение от управителя.
            skippedCount++;
            details.push(`❌ Отложена (Ръчно ревю): ${req.firstName} ${req.lastName} (${req.startDate} до ${req.endDate}). Причина: Има конфликт с одобрена отпуска на друг служител в отдел "${req.department}".`);
         } else {
            // Няма конфликт - ОДОБРЯВАМЕ АВТОМАТИЧНО
            await db.update(leaveRequests)
              .set({ 
                 status: 'approved',
                 approvedBy: userId
              })
              .where(eq(leaveRequests.id, req.id));
              
            approvedCount++;
            details.push(`✅ Одобрена автоматично: ${req.firstName} ${req.lastName} (${req.startDate} до ${req.endDate}). Няма конфликти в отдел "${req.department}".`);
         }
      }

      return {
         success: true,
         message: `AI HR Мениджърът приключи сканирането.\n\n📊 Резултати:\n- Общо чакащи молби: ${pendingRequests.length}\n- Автоматично одобрени: ${approvedCount}\n- Отложени за човешко ревю (заради конфликти): ${skippedCount}\n\nПодробности:\n${details.join('\n')}`
      };

    } catch (err: any) {
      console.error("AI Auto Approve Error:", err);
      return { success: false, message: `Грешка при автоматичното одобрение: ${err.message}` };
    }
  }
});
