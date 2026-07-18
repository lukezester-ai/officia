'use server';

import { predict30DayCashflow } from '@/lib/ai/cashflow-predictor';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getPredictiveCashflow() {
  try {
    const { tenantId } = await requireTenant();
    if (!tenantId) throw new Error('Неоторизиран достъп');

    const result = await predict30DayCashflow(tenantId);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
