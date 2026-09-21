import {
  ensureAutoJournalForInvoice,
  ensureAutoJournalForPurchaseInvoice,
} from '@/lib/accounting/auto-journal';

export async function processAutoPosting(sourceDoc: { id: string; type?: string; supplierName?: string }, tenantId: string) {
  if (!tenantId) {
    return { success: false, error: 'Липсва tenant за осчетоводяване.' };
  }
  if (!sourceDoc?.id) {
    return { success: false, error: 'Липсва документ за осчетоводяване.' };
  }

  const isPurchase = sourceDoc.type === 'purchase' || sourceDoc.type === 'purchase_invoice' || Boolean(sourceDoc.supplierName);
  return isPurchase
    ? ensureAutoJournalForPurchaseInvoice(sourceDoc.id, tenantId)
    : ensureAutoJournalForInvoice(sourceDoc.id, tenantId);
}
