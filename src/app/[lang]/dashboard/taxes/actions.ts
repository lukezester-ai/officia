'use server';
import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { TaxEngine } from '@/lib/accounting/tax-engine';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function getDeclarations() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Not authenticated');

    // Намираме първия tenant на потребителя
    const { users } = await import('@/lib/db/schema/users');
    const userRecords = await db.select().from(users).where(eq(users.clerkId, userId));
    const tenantId = userRecords[0]?.tenantId || 'default-tenant';

    const records = await db.select()
      .from(taxDeclarations)
      .where(eq(taxDeclarations.tenantId, tenantId))
      .orderBy(desc(taxDeclarations.createdAt));

    return { success: true, data: records };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateDds(year: number, month: number) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Not authenticated');

    const { users } = await import('@/lib/db/schema/users');
    const userRecords = await db.select().from(users).where(eq(users.clerkId, userId));
    const tenantId = userRecords[0]?.tenantId || 'default-tenant';

    await TaxEngine.generateDDSDeclaration(tenantId, year, month);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
