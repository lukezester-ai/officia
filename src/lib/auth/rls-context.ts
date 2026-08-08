import { auth, clerkClient } from '@clerk/nextjs/server';
import { cache } from 'react';
import { requireTenant } from './get-tenant';
import type { TenantContext } from '@/lib/db/rls';

// Валидни роли (съвпадат с ролите от src/lib/db/rbac prофил и RLS политиките)
export const RLS_ROLES = [
  'owner',
  'senior_accountant',
  'accountant',
  'junior_accountant',
  'auditor',
  'system',
] as const;
export type RlsRole = (typeof RLS_ROLES)[number];

export function isRlsRole(value: string | null | undefined): value is RlsRole {
  return typeof value === 'string' && (RLS_ROLES as readonly string[]).includes(value);
}

/**
 * Извежда RLS контекста (tenantId, userId, role) за текущата заявка.
 * Кеширан е в рамките на един HTTP request (React cache()).
 * Ролята идва от Clerk publicMetadata.role; ако липсва/невалидна,
 * `role` остава null — тогава RLS политики, зависещи от роля, отказват.
 */
export const getRequestRlsContext = cache(async (): Promise<TenantContext> => {
  const { userId } = await auth();
  const { tenantId } = await requireTenant();

  let role: string | null = null;
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const rawRole = user.publicMetadata?.role;
      if (typeof rawRole === 'string' && isRlsRole(rawRole)) {
        role = rawRole;
      }
    } catch {
      role = null;
    }
  }

  return { tenantId, userId, role };
});