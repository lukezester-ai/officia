'use server';

import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { employees } from '@/lib/db/schema/employees';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { desc, and, sql } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

async function getCurrentUser() {
  try {
    const { user } = await requireTenant();
    return user;
  } catch {
    return null;
  }
}

import { runAIAssistant } from '@/lib/ai/assistant';

export async function askAssistant(query: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return "Моля, влезте в профила си, за да използвате Асистента.";
    if (!user.tenantId) return 'Потребителят не е свързан с фирма.';

    const res = await runAIAssistant(
      query,
      user.tenantId,
      user.id,
      []
    );

    return res.response;
  } catch (error: any) {
    console.error('AI Error:', error);
    return `Извинете, възникна грешка при връзката с AI Асистента. (Грешка: ${error.message || "Непозната грешка"})`;
  }
}
