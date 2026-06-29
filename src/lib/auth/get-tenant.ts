import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema/users';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';
import { provisionUserFromClerk } from '@/lib/auth/provision-user';

/**
 * Взима текущия tenant (работно пространство) за логнатия потребител.
 * Хвърля грешка, ако потребителят не е логнат или няма достъп.
 */
export async function requireTenant() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }

  let userRecords = await db.select().from(users).where(eq(users.clerkId, userId));
  
  if (userRecords.length === 0) {
    await provisionUserFromClerk(userId);
    userRecords = await db.select().from(users).where(eq(users.clerkId, userId));
  }

  if (userRecords.length === 0) {
    throw new Error('User not found in local database');
  }

  const tenantId = userRecords[0].tenantId;
  
  if (!tenantId) {
    throw new Error('User does not belong to any tenant');
  }

  // Извличаме и данните за самия tenant (ако трябват)
  const tenantRecords = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  
  return {
    tenantId,
    tenant: tenantRecords[0] || null,
    userId,
    user: userRecords[0],
  };
}
