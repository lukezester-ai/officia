'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { desc, eq } from 'drizzle-orm';

export async function getHrData() {
  try {
    const allEmployees = await db.select().from(employees).orderBy(desc(employees.startDate));
    
    // AI HR Alerts Logic
    const alerts = [];
    for (const emp of allEmployees) {
      if (!emp.aiStatus) {
        // Mocking some logic based on missing end dates or something
        if (emp.contractType === 'contractor' && !emp.endDate) {
          alerts.push({ employeeId: emp.id, name: `${emp.firstName} ${emp.lastName}`, issue: 'Договор за изпълнител без крайна дата.' });
        }
      } else {
        alerts.push({ employeeId: emp.id, name: `${emp.firstName} ${emp.lastName}`, issue: emp.aiStatus });
      }
    }

    return { 
      success: true, 
      data: {
        employees: allEmployees,
        alerts
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { tenants } from '@/lib/db/schema/tenants';
import { revalidatePath } from 'next/cache';

async function getTenant() {
  const [tenant] = await db.select().from(tenants).limit(1);
  return tenant;
}

export async function createEmployee(data: any) {
  try {
    const tenant = await getTenant();
    if (!tenant) return { success: false, error: 'Липсва Tenant' };

    await db.insert(employees).values({
      tenantId: tenant.id,
      userId: tenant.id, // using tenant.id as placeholder for userId
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
    await db.update(employees)
      .set({ workStatus: newStatus })
      .where(eq(employees.id, id));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}