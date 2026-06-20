'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { desc } from 'drizzle-orm';

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