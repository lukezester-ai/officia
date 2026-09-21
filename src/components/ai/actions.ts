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

import { runAIAssistant } from '@/lib/ai/assistant';

export async function askAssistant(query: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return "Моля, влезте в профила си, за да използвате Асистента.";

    const res = await runAIAssistant(
      query,
      user.tenantId || 'default',
      user.clerkId || 'default',
      []
    );

    return res.response;
  } catch (error: any) {
    console.error('AI Error:', error);
    return `Извинете, възникна грешка при връзката с AI Асистента. (Грешка: ${error.message || "Непозната грешка"})`;
  }
}
