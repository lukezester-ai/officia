'use server';
// @ts-nocheck

import { db } from '@/lib/db/db';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { requireTenant } from '@/lib/auth/get-tenant';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const TYPE_LABELS: Record<string, string> = {
  annual:  'Платен отпуск',
  sick:    'Болничен',
  unpaid:  'Неплатен отпуск',
  other:   'Друг',
};

const WORK_STATUS_MAP: Record<string, string> = {
  annual: 'on_leave',
  sick:   'sick_leave',
  unpaid: 'unpaid_leave',
  other:  'on_leave',
};

export async function getLeaveRequests() {
  try {
    const { tenantId } = await requireTenant();

    const rows = await db
      .select({
        id:           leaveRequests.id,
        employeeId:   leaveRequests.employeeId,
        startDate:    leaveRequests.startDate,
        endDate:      leaveRequests.endDate,
        type:         leaveRequests.type,
        reason:       leaveRequests.reason,
        status:       leaveRequests.status,
        createdAt:    leaveRequests.createdAt,
        firstName:    employees.firstName,
        lastName:     employees.lastName,
        position:     employees.position,
        workStatus:   employees.workStatus,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(eq(leaveRequests.tenantId, tenantId))
      .orderBy(desc(leaveRequests.createdAt));

    return {
      success: true,
      data: rows.map(r => ({
        ...r,
        typeLabel: TYPE_LABELS[r.type] ?? r.type,
        days: Math.round(
          (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000
        ) + 1,
      })),
    };
  } catch (e: any) {
    return { success: false, error: e?.message, data: [] };
  }
}

export async function createLeaveRequest(data: {
  employeeId: string;
  startDate: string;
  endDate: string;
  type: 'annual' | 'sick' | 'unpaid' | 'other';
  reason?: string;
}) {
  try {
    const { tenantId } = await requireTenant();

    await db.insert(leaveRequests).values({
      tenantId,
      employeeId: data.employeeId,
      startDate:  data.startDate,
      endDate:    data.endDate,
      type:       data.type,
      reason:     data.reason || null,
      status:     'pending',
    });

    revalidatePath('/bg/dashboard/hr');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

export async function approveLeaveRequest(id: string, employeeId: string, type: string) {
  try {
    await db.update(leaveRequests)
      .set({ status: 'approved' })
      .where(eq(leaveRequests.id, id));

    // Обновяваме workStatus на служителя
    const newStatus = WORK_STATUS_MAP[type] ?? 'on_leave';
    await db.update(employees)
      .set({ workStatus: newStatus })
      .where(eq(employees.id, employeeId));

    revalidatePath('/bg/dashboard/hr');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

export async function rejectLeaveRequest(id: string) {
  try {
    await db.update(leaveRequests)
      .set({ status: 'rejected' })
      .where(eq(leaveRequests.id, id));

    revalidatePath('/bg/dashboard/hr');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

export async function getEmployeesForSelect() {
  try {
    const { tenantId } = await requireTenant();
    const emps = await db
      .select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName, position: employees.position })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));
    return { success: true, data: emps };
  } catch (e: any) {
    return { success: false, data: [] };
  }
}

const ANNUAL_DAYS_LIMIT = 20; // КТ стандарт – 20 дни платен отпуск/год.

export async function getLeaveBalance() {
  try {
    const { tenantId } = await requireTenant();

    // Всички активни служители
    const emps = await db
      .select({
        id:        employees.id,
        firstName: employees.firstName,
        lastName:  employees.lastName,
        position:  employees.position,
        workStatus: employees.workStatus,
      })
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true)));

    if (emps.length === 0) return { success: true, data: [] };

    // Одобрени заявки за текущата година
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd   = `${year}-12-31`;

    const approved = await db
      .select({
        employeeId: leaveRequests.employeeId,
        type:       leaveRequests.type,
        startDate:  leaveRequests.startDate,
        endDate:    leaveRequests.endDate,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.tenantId, tenantId),
          eq(leaveRequests.status, 'approved'),
        )
      );

    // Изчисляваме дни по служител
    function countDays(start: string, end: string) {
      return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
    }

    const balance = emps.map(emp => {
      const empLeaves = approved.filter(l => l.employeeId === emp.id);
      const annualUsed = empLeaves
        .filter(l => l.type === 'annual')
        .reduce((sum, l) => sum + countDays(l.startDate, l.endDate), 0);
      const sickDays = empLeaves
        .filter(l => l.type === 'sick')
        .reduce((sum, l) => sum + countDays(l.startDate, l.endDate), 0);
      const unpaidDays = empLeaves
        .filter(l => l.type === 'unpaid')
        .reduce((sum, l) => sum + countDays(l.startDate, l.endDate), 0);

      return {
        ...emp,
        annualLimit:   ANNUAL_DAYS_LIMIT,
        annualUsed,
        annualLeft:    Math.max(0, ANNUAL_DAYS_LIMIT - annualUsed),
        sickDays,
        unpaidDays,
      };
    });

    return { success: true, data: balance };
  } catch (e: any) {
    return { success: false, error: e?.message, data: [] };
  }
}
