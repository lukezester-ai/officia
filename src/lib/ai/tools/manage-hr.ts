// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { tasks } from '@/lib/db/schema/tasks';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { eq, and, or, ilike, gte, lte } from 'drizzle-orm';

export const buildManageHRTool = (tenantId: string) => tool({
  description: "Асистент за Човешки ресурси и Задачи. Използвай го, когато потребителят пита кой е в отпуска, търси служител или иска да създаде/възложи задача на някого.",
  parameters: z.object({
    action: z.enum(['check_leaves', 'create_task', 'find_employee']).describe("Действие: проверка на отпуски, създаване на задача или търсене на служител"),
    taskTitle: z.string().optional().describe("Заглавие/описание на задачата (само за create_task)"),
    assigneeName: z.string().optional().describe("Име на служител (за търсене или възлагане на задача)"),
    dateToCheck: z.string().optional().describe("Дата за проверка на отпуски (YYYY-MM-DD). Ако липсва, ползвай днес.")
  }),
  execute: async ({ action, taskTitle, assigneeName, dateToCheck }) => {
    try {
      // Търсене на служител по име
      const findEmployee = async (name: string) => {
        const emps = await db.select().from(employees).where(
          and(
            eq(employees.tenantId, tenantId),
            or(
              ilike(employees.firstName, `%${name}%`),
              ilike(employees.lastName, `%${name}%`)
            )
          )
        );
        return emps;
      };

      if (action === 'find_employee') {
        if (!assigneeName) return { success: false, message: "Трябва да подадеш име на служител." };
        const emps = await findEmployee(assigneeName);
        if (emps.length === 0) return { success: true, message: `Не намерих служител с име ${assigneeName}.` };
        
        const details = emps.map(e => `${e.firstName} ${e.lastName} - ${e.position} (${e.email})`).join('\n');
        return { success: true, message: `Намерих следните служители:\n${details}` };
      }

      if (action === 'check_leaves') {
        const targetDate = dateToCheck ? new Date(dateToCheck) : new Date();
        const formattedDate = targetDate.toISOString().split('T')[0];

        // Търсим отпуски, които покриват тази дата
        const leaves = await db.select({
           firstName: employees.firstName,
           lastName: employees.lastName,
           type: leaveRequests.type,
           startDate: leaveRequests.startDate,
           endDate: leaveRequests.endDate,
        })
        .from(leaveRequests)
        .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .where(
           and(
             eq(leaveRequests.tenantId, tenantId),
             eq(leaveRequests.status, 'approved'),
             lte(leaveRequests.startDate, formattedDate),
             gte(leaveRequests.endDate, formattedDate)
           )
        );

        if (leaves.length === 0) {
          return { success: true, message: `Няма служители в отпуска на дата ${formattedDate}.` };
        }

        const details = leaves.map(l => `- ${l.firstName} ${l.lastName} е в ${l.type} отпуска до ${l.endDate}`).join('\n');
        return { success: true, message: `Служители в отпуска на ${formattedDate}:\n${details}` };
      }

      if (action === 'create_task') {
        if (!taskTitle) return { success: false, message: "Трябва да зададеш заглавие на задачата." };
        
        let assignedTo = "Неразпределена";
        
        if (assigneeName) {
           const emps = await findEmployee(assigneeName);
           if (emps.length > 0) {
              assignedTo = `${emps[0].firstName} ${emps[0].lastName}`;
           } else {
              return { success: false, message: `Не намерих служител с име ${assigneeName}, за да му възложа задачата.` };
           }
        }

        const [newTask] = await db.insert(tasks).values({
          tenantId,
          title: taskTitle,
          status: 'suggested',
          priority: 'medium',
          assignee: assignedTo,
        }).returning();

        return { 
          success: true, 
          message: `Успешно създадох задача "${taskTitle}". Възложена на: ${assignedTo}.` 
        };
      }

    } catch (err: any) {
      console.error("AI Manage HR Error:", err);
      return { success: false, message: `Грешка в HR модула: ${err.message}` };
    }
  }
});
