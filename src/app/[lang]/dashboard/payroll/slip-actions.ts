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
