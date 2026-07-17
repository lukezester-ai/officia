// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { eq, and } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export interface EmployeeWithSalary {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  salary: string | null;
  department: string | null;
}

/**
 * Връща всички активни служители с техните заплати за текущия tenant.
 */
export async function getEmployeesWithSalary(): Promise<{
  success: boolean;
  data?: EmployeeWithSalary[];
  error?: string;
}> {
  try {
    const { tenantId } = await requireTenant();

    const rows = await db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        position: employees.position,
        salary: employees.salary,
        department: employees.department,
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.isActive, true)
        )
      );

    return { success: true, data: rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { PayrollAdjustments } from '@/lib/payroll/calculator';

/**
 * Извлича одобрените отпуски и болнични за даден служител за избран месец/година (Връзка ЧР ↔ ТРЗ).
 */
export async function getEmployeeLeaveAdjustments(
  employeeId: string,
  month: string,
  year: number
): Promise<{ success: boolean; adjustments?: PayrollAdjustments; error?: string }> {
  try {
    const { tenantId } = await requireTenant();

    const leaves = await db
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.tenantId, tenantId),
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.status, 'approved')
        )
      );

    const monthIndex = [
      'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
      'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
    ].indexOf(month);

    let paidLeaveDays = 0;
    let sickDaysEmployer = 0;
    let sickDaysNOI = 0;
    let unpaidLeaveDays = 0;

    for (const l of leaves) {
      if (!l.startDate || !l.endDate) continue;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);

      // Check if leave falls in selected month and year
      if (start.getFullYear() === year && start.getMonth() === monthIndex) {
        // Approximate working days in range (Monday - Friday)
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
          if (cur.getMonth() === monthIndex && cur.getDay() !== 0 && cur.getDay() !== 6) {
            count++;
          }
          cur.setDate(cur.getDate() + 1);
        }

        if (count > 0) {
          if (l.type === 'annual') {
            paidLeaveDays += count;
          } else if (l.type === 'sick') {
            const empDays = Math.min(count, 3);
            const noiDays = Math.max(0, count - 3);
            sickDaysEmployer += empDays;
            sickDaysNOI += noiDays;
          } else if (l.type === 'unpaid') {
            unpaidLeaveDays += count;
          }
        }
      }
    }

    const workingDays = 21;
    const workedDays = Math.max(0, workingDays - paidLeaveDays - sickDaysEmployer - sickDaysNOI - unpaidLeaveDays);

    return {
      success: true,
      adjustments: {
        workingDays,
        workedDays,
        paidLeaveDays,
        sickDaysEmployer,
        sickDaysNOI,
        unpaidLeaveDays,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
