'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { users } from '@/lib/db/schema/users';
import { eq, desc, and, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  return user;
}

export async function askAssistant(query: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return "Моля, влезте в профила си, за да използвате Асистента.";

    const text = query.toLowerCase();

    // 1. Фактури
    if (text.includes('фактур') || text.includes('неплатен')) {
      const invs = await db.select()
        .from(invoices)
        .where(and(eq(invoices.tenantId, user.tenantId), eq(invoices.status, 'sent'))); // assuming 'sent' or 'draft' means unpaid
      
      const totalAmount = invs.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      
      if (invs.length === 0) {
        return "Нямате неплатени фактури в момента. Всичко е изчистено!";
      }

      return `В момента имате **${invs.length} неплатени фактури** на обща стойност **${totalAmount.toFixed(2)} лв.**`;
    }

    // 2. Отпуски
    if (text.includes('отпуск') || text.includes('почив')) {
      const leaves = await db.select()
        .from(leaveRequests)
        .where(and(eq(leaveRequests.tenantId, user.tenantId), eq(leaveRequests.status, 'pending')));
        
      if (leaves.length === 0) {
        return "Няма чакащи молби за отпуск.";
      }

      return `Имате **${leaves.length} чакащи молби за отпуск**, които се нуждаят от вашето одобрение. Можете да ги прегледате в секция HR.`;
    }

    // 3. Заплати
    if (text.includes('заплат')) {
      const emps = await db.select()
        .from(employees)
        .where(and(eq(employees.tenantId, user.tenantId), eq(employees.isActive, true)));
        
      const totalSalary = emps.reduce((sum, emp) => sum + parseFloat(emp.salary || '0'), 0);
      
      return `Във фирмата имате ${emps.length} активни служители. Общият разход за техните месечни заплати е **${totalSalary.toFixed(2)} лв.**`;
    }

    // 4. Разходи / Журнал
    if (text.includes('разход') || text.includes('баланс') || text.includes('журнал')) {
      const journals = await db.select()
        .from(journalHeaders)
        .where(eq(journalHeaders.tenantId, user.tenantId))
        .orderBy(desc(journalHeaders.entryDate))
        .limit(5);
        
      if (journals.length === 0) {
        return "Все още нямате записи в счетоводния журнал.";
      }
      
      return `Ето последните ви ${journals.length} записа в Журнала:\n\n${journals.map(j => `- ${j.description} (${new Date(j.entryDate).toLocaleDateString('bg-BG')})`).join('\n')}`;
    }

    return "Здравейте! Аз съм вашият Officia AI. Мога да ви дам бърза справка за **фактури**, **отпуски**, **заплати** или **разходи**. Просто ме попитайте!";
  } catch (error: any) {
    console.error('AI Error:', error);
    return "Извинете, възникна грешка при обработката на вашето запитване.";
  }
}
