// @ts-nocheck
'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { tenants } from '@/lib/db/schema/tenants';
import { users } from '@/lib/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getEmployees() {
  try {
    const data = await db.select().from(employees).orderBy(desc(employees.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function createEmployee(employeeData: any) {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    const [user] = await db.select().from(users).limit(1);
    if (!tenant || !user) return { success: false, error: 'Липсва конфигурация за компанията' };

    const parts = (employeeData.name || '').trim().split(' ');
    const firstName = parts[0] || 'Служител';
    const lastName = parts.slice(1).join(' ') || '';

    const [newEmployee] = await db.insert(employees).values({
      tenantId: tenant.id,
      userId: user.id,
      firstName,
      lastName,
      email: employeeData.email,
      position: employeeData.position,
      department: employeeData.department,
      salary: employeeData.salary?.toString() ?? '0',
      contractType: 'full_time',
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
    }).returning();

    revalidatePath('/', 'layout');
    return { success: true, data: newEmployee };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLeaveRequests() {
  try {
    const data = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        type: leaveRequests.type,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .orderBy(desc(leaveRequests.createdAt));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
  try {
    await db.update(leaveRequests).set({ status }).where(eq(leaveRequests.id, id));
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}