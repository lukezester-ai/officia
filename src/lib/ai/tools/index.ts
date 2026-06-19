// @ts-nocheck
import { createInvoiceTool } from './create-invoice';
import { getFinancialSummaryTool } from './get-financial-summary';
import { analyzeDocumentTool } from './analyze-document';
import { bankReconcileTool } from './bank-reconcile';
import { createJournalEntryTool } from './create-journal-entry';
import { generateReportTool } from './generate-report';
import { searchDocumentsTool } from './search-documents';

export const tools = {
  createInvoice: createInvoiceTool,
  getFinancialSummary: getFinancialSummaryTool,
  analyzeDocument: analyzeDocumentTool,
  bankReconcile: bankReconcileTool,
  createJournalEntry: createJournalEntryTool,
  generateReport: generateReportTool,
  searchDocuments: searchDocumentsTool,
};
