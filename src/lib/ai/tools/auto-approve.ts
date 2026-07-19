// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { eq, and } from 'drizzle-orm';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';

export const buildAutoApproveTool = (tenantId: string, userId: string) => tool({
  description: "HR Мениджър: сканира чакащите молби за отпуск и подготвя одобрения. Реалното одобрение става след human review.",
  parameters: z.object({
     run: z.boolean().optional().describe("Трябва да е true за стартиране"),
  }),
  execute: async () => {
    try {
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

      return await queueAiApprovalRequest({
        tenantId,
        userId,
        actionKey: 'autoApprove',
        risk: 'high',
        title: 'Review AI leave approvals',
        description: `AI found ${pendingRequests.length} pending leave request(s). Approval must be confirmed by a human before HR records change.`,
        sourceType: 'leave_request',
        payload: {
          requestIds: pendingRequests.map((request) => request.id),
        },
        summary: {
          pendingCount: pendingRequests.length,
          requests: pendingRequests.map((request) => ({
            id: request.id,
            employeeId: request.employeeId,
            employeeName: `${request.firstName || ''} ${request.lastName || ''}`.trim(),
            department: request.department,
            startDate: request.startDate,
            endDate: request.endDate,
          })),
        },
      });
    } catch (err: any) {
      console.error("AI Auto Approve Error:", err);
      return { success: false, message: `Грешка при автоматичното одобрение: ${err.message}` };
    }
  }
});
