import { cache } from 'react';
import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { tenantInvites } from '@/lib/db/schema/tenant_invites';
import { users } from '@/lib/db/schema/users';
import { requireTenant } from '@/lib/auth/get-tenant';
import {
  daysLeft,
  isAccessOpen,
  isPlanId,
  rulesFor,
  type PlanId,
  type PlanModules,
} from '@/lib/billing/plan-rules';

export {
  TRIAL_DAYS,
  STARTER_INVOICE_CAP,
  PLAN_IDS,
  isPlanId,
  rulesFor,
  trialEndsFrom,
  isAccessOpen,
  daysLeft,
} from '@/lib/billing/plan-rules';
export type { PlanId, PlanModules, PlanLimits } from '@/lib/billing/plan-rules';

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

function asPlan(value: unknown): PlanId {
  return isPlanId(value) ? value : 'starter';
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function scalar(query: ReturnType<typeof sql>) {
  const rows: any = await db.execute(query);
  const row = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
  return Number(row?.count ?? 0);
}

export const getEntitlement = cache(async () => {
  const { tenantId, tenant } = await requireTenant();
  const plan = asPlan(tenant?.plan);
  const subscriptionStatus = String(tenant?.subscription_status ?? tenant?.subscriptionStatus ?? 'trialing');
  const trialEndsAt = asDate(tenant?.trial_ends_at ?? tenant?.trialEndsAt);
  const now = new Date();
  const rules = rulesFor(plan);
  const active = isAccessOpen({ plan, subscriptionStatus, trialEndsAt, now });

  const [userCount, inviteCount, invoiceCount, employeeCount] = await Promise.all([
    scalar(sql`SELECT count(*)::int AS count FROM users WHERE tenant_id = ${tenantId} AND is_active IS DISTINCT FROM false`),
    scalar(sql`SELECT count(*)::int AS count FROM tenant_invites WHERE tenant_id = ${tenantId}`),
    scalar(sql`
      SELECT count(*)::int AS count
      FROM invoices
      WHERE tenant_id = ${tenantId}
        AND coalesce(invoice_number, '') NOT LIKE 'SUB-%'
        AND created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Sofia') AT TIME ZONE 'Europe/Sofia'
    `),
    db.select({ id: employees.id }).from(employees).where(and(eq(employees.tenantId, tenantId), eq(employees.isActive, true))).then((rows) => rows.length),
  ]);

  return {
    tenantId,
    plan,
    subscriptionStatus,
    trialEndsAt,
    active,
    daysLeft: plan === 'starter' ? daysLeft(trialEndsAt, now) : null,
    limits: rules.limits,
    modules: rules.modules,
    usage: {
      users: userCount + inviteCount,
      invoicesThisMonth: invoiceCount,
      employees: employeeCount,
    },
  };
});

function closedMessage(access: Awaited<ReturnType<typeof getEntitlement>>) {
  if (!access.active) {
    return '14-дневният достъп приключи. Платете план, за да продължите.';
  }
  return null;
}

export async function requireOpenAccess() {
  const access = await getEntitlement();
  const closed = closedMessage(access);
  if (closed) throw new PlanLimitError(closed);
  return access;
}

const MODULE_LABEL: Record<keyof PlanModules, string> = {
  payroll: 'ТРЗ',
  hr: 'Кадрите',
  ai: 'AI асистентът',
  vatZip: 'ZIP файлът за ДДС',
};

export async function requireModule(module: keyof PlanModules) {
  const access = await requireOpenAccess();
  if (!access.modules[module]) {
    throw new PlanLimitError(`${MODULE_LABEL[module]} не е включен в текущия план.`);
  }
  return access;
}

export async function assertCanCreateInvoice() {
  const access = await requireOpenAccess();
  const cap = access.limits.invoicesPerMonth;
  if (cap == null) return access;
  if (access.usage.invoicesThisMonth >= cap) {
    throw new PlanLimitError(`Стартерът включва до ${cap} фактури за месец.`);
  }
  return access;
}

export async function assertCanAddEmployee() {
  const access = await requireModule('hr');
  const cap = access.limits.employees;
  if (cap == null) return access;
  if (access.usage.employees >= cap) {
    throw new PlanLimitError(`Планът включва до ${cap} служители.`);
  }
  return access;
}

export async function assertCanInviteUser() {
  const access = await requireOpenAccess();
  const cap = access.limits.users;
  if (cap == null) return access;
  if (access.usage.users >= cap) {
    throw new PlanLimitError(`Планът включва до ${cap} ${cap === 1 ? 'потребител' : 'потребители'}.`);
  }
  return access;
}

export async function moduleDeniedResponse(module: keyof PlanModules) {
  try {
    await requireModule(module);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Няма достъп до този модул.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function listTenantUsers(tenantId: string) {
  return db
    .select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
    .from(users)
    .where(eq(users.tenantId, tenantId));
}

export async function listTenantInvites(tenantId: string) {
  return db
    .select({ id: tenantInvites.id, email: tenantInvites.email })
    .from(tenantInvites)
    .where(eq(tenantInvites.tenantId, tenantId));
}
