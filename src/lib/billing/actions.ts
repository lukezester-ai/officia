'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { countInvoicesThisMonth, getTenantBilling } from '@/lib/billing/enforcement';

export async function getBillingSummary() {
  try {
    const { tenantId } = await requireTenant();
    const billing = await getTenantBilling(tenantId);
    if (!billing) return { success: false as const, error: 'No tenant' };

    const usedInvoices = await countInvoicesThisMonth(tenantId);
    const limit = billing.limits.invoicesPerMonth;

    return {
      success: true as const,
      data: {
        plan: billing.plan,
        trialEndsAt: billing.trialEndsAt?.toISOString() ?? null,
        usedInvoices,
        invoiceLimit: Number.isFinite(limit) ? limit : null,
        bankSync: billing.limits.bankSync,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    return { success: false as const, error: message };
  }
}
