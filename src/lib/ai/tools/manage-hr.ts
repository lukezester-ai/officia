import { tool } from 'ai';
import { z } from 'zod';
import { and, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildManageHRTool = (tenantId: string, userId: string) =>
  tool({
    description: 'HR справки и предложения за задачи. Създаването на задача винаги изисква човешко одобрение.',
    inputSchema: z.object({
      action: z.enum(['check_leaves', 'create_task', 'find_employee']),
      taskTitle: z.string().optional(),
      assigneeName: z.string().optional(),
      dateToCheck: z.string().optional(),
    }),
    execute: async ({ action, taskTitle, assigneeName, dateToCheck }) => {
      const findEmployees = (name: string) =>
        db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.tenantId, tenantId),
              or(ilike(employees.firstName, `%${name}%`), ilike(employees.lastName, `%${name}%`)),
            ),
          );

      if (action === 'find_employee') {
        if (!assigneeName) return { success: false, message: 'Посочи име на служител.' };
        const matches = await findEmployees(assigneeName);
        return {
          success: true,
          message:
            matches.length === 0
              ? `Не е намерен служител: ${assigneeName}.`
              : matches.map((item) => `${item.firstName} ${item.lastName} — ${item.position ?? ''} (${item.email})`).join('\n'),
        };
      }

      if (action === 'check_leaves') {
        const target = dateToCheck || new Date().toISOString().slice(0, 10);
        const leaves = await db
          .select({
            firstName: employees.firstName,
            lastName: employees.lastName,
            type: leaveRequests.type,
            endDate: leaveRequests.endDate,
          })
          .from(leaveRequests)
          .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
          .where(
            and(
              eq(leaveRequests.tenantId, tenantId),
              eq(leaveRequests.status, 'approved'),
              lte(leaveRequests.startDate, target),
              gte(leaveRequests.endDate, target),
            ),
          );
        return {
          success: true,
          message:
            leaves.length === 0
              ? `Няма служители в отпуск на ${target}.`
              : leaves.map((item) => `${item.firstName} ${item.lastName}: ${item.type} до ${item.endDate}`).join('\n'),
        };
      }

      if (!taskTitle) return { success: false, message: 'Посочи заглавие на задачата.' };
      return queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'manageHR.createTask',
        risk: 'medium',
        title: `Одобрение на HR задача: ${taskTitle}`,
        description: assigneeName ? `Предложена задача за ${assigneeName}.` : 'Предложена неразпределена задача.',
        sourceType: 'task',
        payload: { taskTitle, assigneeName },
        summary: { taskTitle, assigneeName: assigneeName ?? null },
      });
    },
  });
