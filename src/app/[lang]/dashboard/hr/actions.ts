'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { users } from '@/lib/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  return user;
}

export async function getEmployees() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const data = await db.select()
      .from(employees)
      .where(eq(employees.tenantId, user.tenantId))
      .orderBy(desc(employees.createdAt))
      .limit(100);
      
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return { success: false, error: error.message };
  }
}

export async function createEmployee(empData: any) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const [newEmp] = await db.insert(employees).values({
      tenantId: user.tenantId,
      userId: user.id,
      firstName: empData.firstName,
      lastName: empData.lastName,
      email: empData.email,
      position: empData.position,
      department: empData.department,
      salary: empData.salary.toString(),
      startDate: new Date(empData.joinDate),
      isActive: true,
    }).returning();

    revalidatePath('/', 'layout');
    return { success: true, data: newEmp };
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return { success: false, error: error.message };
  }
}

export async function paySalary(employeeId: string, amount: string, employeeName: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Create a Journal Entry for the salary payment to link with Accounting
    const journalNum = `JRNL-${Date.now().toString().slice(-6)}`;
    
    await db.insert(journalHeaders).values({
      tenantId: user.tenantId,
      userId: user.id,
      journalNumber: journalNum,
      entryDate: new Date(),
      description: `Изплатена заплата: ${employeeName}`,
      status: 'posted'
    });
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('Error paying salary:', error);
    return { success: false, error: error.message };
  }
}
