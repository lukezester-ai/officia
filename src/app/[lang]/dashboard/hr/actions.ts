'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { desc, eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';

async function getTenantContext() {
  const { tenantId, userId } = await requireTenant();
  return { tenantId, userId };
}

export async function getHrData() {
  try {
    const { tenantId } = await getTenantContext();
    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .orderBy(desc(employees.startDate));

    const alerts = [];
    for (const emp of allEmployees) {
      if (!emp.aiStatus) {
        if (emp.contractType === 'contractor' && !emp.endDate) {
          alerts.push({
            employeeId: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            issue: 'Договор за изпълнител без крайна дата.',
          });
        }
      } else {
        alerts.push({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          issue: emp.aiStatus,
        });
      }
    }

    return {
      success: true,
      data: {
        employees: allEmployees,
        alerts,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEmployee(data: any) {
  try {
    const { tenantId, userId } = await getTenantContext();

    await db.insert(employees).values({
      tenantId,
      userId,
      firstName: data.name.split(' ')[0] || '',
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      email: data.email,
      position: data.position,
      department: data.department,
      salary: data.salary ? data.salary.toString() : null,
      contractType: 'full_time',
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      workStatus: 'at_work',
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEmployeeStatus(id: string, newStatus: string) {
  try {
    const { tenantId } = await getTenantContext();
    await db
      .update(employees)
      .set({ workStatus: newStatus })
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
