export interface AutoPostSourceDocument {
  id: string;
  totalAmount: number;
  netAmount: number;
  vatAmount: number;
}

export async function processAutoPosting(sourceDoc: AutoPostSourceDocument, tenantId: string) {
  console.log(`Автоматично осчетоводяване на документ ${sourceDoc.id} за tenant ${tenantId}...`);

  const lines: Array<{ accountId: string; entryType: 'debit' | 'credit'; amount: number }> = [];

  lines.push({ accountId: 'uuid-501', entryType: 'debit', amount: sourceDoc.totalAmount });
  lines.push({ accountId: 'uuid-701', entryType: 'credit', amount: sourceDoc.netAmount });

  if (sourceDoc.vatAmount > 0) {
    lines.push({ accountId: 'uuid-4532', entryType: 'credit', amount: sourceDoc.vatAmount });
  }

  return {
    success: true,
    journalHeaderId: 'mock-journal-header-uuid',
    linesCreated: lines.length,
  };
}
