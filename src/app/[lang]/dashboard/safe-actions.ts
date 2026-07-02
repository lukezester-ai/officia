'use server';

import { getInvoices } from './invoices/actions';

export async function getInvoicesForDashboard() {
  try {
    const result = await getInvoices();
    if (!result.success) {
      return {
        success: true,
        data: [],
        error: result.error || 'Фактурите не могат да се заредят.',
      };
    }

    return {
      success: true,
      data: result.data || [],
      error: null,
    };
  } catch (error) {
    return {
      success: true,
      data: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
