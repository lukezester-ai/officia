import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { tenants } from '@/lib/db/schema/tenants';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getPlanLimits, resolveEffectivePlan, type PlanId } from '@/lib/billing/plans';

export type TenantBilling = {
  plan: PlanId;
  trialEndsAt: Date | null;
  limits: ReturnType<typeof getPlanLimits>;
};

export async function getTenantBilling(tenantId: string): Promise<TenantBilling | null> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return null;

  const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const plan = resolveEffectivePlan(tenant.plan, trialEndsAt);

  return {
    plan,
    trialEndsAt,
    limits: getPlanLimits(plan),
  };
}

export async function countInvoicesThisMonth(tenantId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [sales] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), gte(invoices.createdAt, startOfMonth)));

  const [purchases] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseInvoices)
    .where(and(eq(purchaseInvoices.tenantId, tenantId), gte(purchaseInvoices.createdAt, startOfMonth)));

  return (sales?.count ?? 0) + (purchases?.count ?? 0);
}

export async function assertCanCreateInvoice(tenantId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const billing = await getTenantBilling(tenantId);
  if (!billing) return { ok: false, error: 'Липсва workspace' };

  const limit = billing.limits.invoicesPerMonth;
  if (!Number.isFinite(limit)) return { ok: true };

  const used = await countInvoicesThisMonth(tenantId);
  if (used >= limit) {
    return {
      ok: false,
      error: `Достигнахте лимита от ${limit} фактури/месец (Стартер). Надградете до Про за неограничен брой.`,
    };
  }

  return { ok: true };
}

export function assertFeature(billing: TenantBilling, feature: 'bankSync' | 'aiOcr'): { ok: true } | { ok: false; error: string } {
  if (feature === 'bankSync' && !billing.limits.bankSync) {
    return { ok: false, error: 'Банковата синхронизация е достъпна в Pro план.' };
  }
  if (feature === 'aiOcr' && !billing.limits.aiOcr) {
    return { ok: false, error: 'AI анализът не е достъпен за текущия план.' };
  }
  return { ok: true };
}
