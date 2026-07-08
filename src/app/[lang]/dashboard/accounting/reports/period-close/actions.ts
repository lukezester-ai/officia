'use server';

import { requireTenant } from '@/lib/auth/get-tenant';
import { PeriodCloser } from '@/lib/accounting/period-close';

export async function getPeriods() {
  try {
    const { tenantId } = await requireTenant();
    const periods = await PeriodCloser.getPeriods(tenantId);
    return { success: true, periods };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getClosingPreview(periodId: string) {
  try {
    const { tenantId } = await requireTenant();
    const preview = await PeriodCloser.getClosingPreview(tenantId, periodId);
    return { success: true, preview };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closePeriod(periodId: string) {
  try {
    const { tenantId, userId } = await requireTenant();
    const result = await PeriodCloser.closePeriod(tenantId, periodId, userId);
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reopenPeriod(periodId: string) {
  try {
    const { tenantId } = await requireTenant();
    await PeriodCloser.reopenPeriod(tenantId, periodId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
