// @ts-nocheck
import { buildCreateInvoiceTool } from './create-invoice';
import { buildGetFinancialSummaryTool } from './get-financial-summary';
import { buildSearchDocumentsTool } from './search-documents';
import { buildBankMatchTool } from './bank-match';
import { buildCreateExpenseTool } from './create-expense';
import { buildCreateJournalEntryTool } from './create-journal-entry';
import { buildManageHRTool } from './manage-hr';
import { buildManageInventoryTool } from './manage-inventory';
import { buildGenerateVatTool } from './generate-vat';
import { buildDepreciateAssetsTool } from './depreciate-assets';
import { buildAutoApproveTool } from './auto-approve';
import { buildProcessInboxTool } from './process-inbox';
import { buildGenerateChartTool } from './generate-chart';
import { buildCheckNraStatusTool } from './check-nra-status';
import { buildCheckNraLiabilitiesTool } from './check-nra-liabilities';

// Dummy instantiated tools just to get their descriptions for the API endpoint
const dummyId = '00000000-0000-0000-0000-000000000000';

export const tools = {
  createInvoice: buildCreateInvoiceTool(dummyId, dummyId),
  getFinancialSummary: buildGetFinancialSummaryTool(dummyId),
  searchDocuments: buildSearchDocumentsTool(dummyId),
  bankMatch: buildBankMatchTool(dummyId),
  createExpense: buildCreateExpenseTool(dummyId, dummyId),
  createJournalEntry: buildCreateJournalEntryTool(dummyId, dummyId),
  manageHR: buildManageHRTool(dummyId),
  manageInventory: buildManageInventoryTool(dummyId),
  generateVat: buildGenerateVatTool(dummyId, dummyId),
  depreciateAssets: buildDepreciateAssetsTool(dummyId, dummyId),
  autoApprove: buildAutoApproveTool(dummyId, dummyId),
  processInbox: buildProcessInboxTool(dummyId),
  generateChart: buildGenerateChartTool(),
  checkNraStatus: buildCheckNraStatusTool(),
  checkNraLiabilities: buildCheckNraLiabilitiesTool(),
};
