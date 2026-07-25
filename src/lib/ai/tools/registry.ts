type ToolFactory = (...args: string[]) => unknown;

type ToolEntry = {
  name: string;
  description: string;
  factory: () => Promise<{ default: ToolFactory }>;
};

const toolRegistry = new Map<string, ToolEntry>();

function register(name: string, description: string, factory: () => Promise<{ default: ToolFactory }>) {
  toolRegistry.set(name, { name, description, factory });
}

export function listTools(): { name: string; description: string }[] {
  return [...toolRegistry.values()].map(t => ({ name: t.name, description: t.description }));
}

export async function loadTool(name: string, ...args: string[]) {
  const entry = toolRegistry.get(name);
  if (!entry) throw new Error(`Unknown tool: ${name}`);
  const mod = await entry.factory();
  return mod.default(...args) as ReturnType<typeof import('ai').tool>;
}

export async function loadAllTools(...args: string[]) {
  const entries = [...toolRegistry.values()];
  const results: Record<string, ReturnType<typeof import('ai').tool>> = {};
  for (const entry of entries) {
    const mod = await entry.factory();
    results[entry.name] = mod.default(...args) as ReturnType<typeof import('ai').tool>;
  }
  return results;
}

register('createInvoice', 'Създава нова продажна фактура към клиент', () => import('./create-invoice').then(m => ({ default: m.buildCreateInvoiceTool })));
register('bankMatch', 'Bank matching — автоматично банково равнение', () => import('./bank-match').then(m => ({ default: m.buildBankMatchTool })));
register('createExpense', 'Създава нов разход', () => import('./create-expense').then(m => ({ default: m.buildCreateExpenseTool })));
register('createJournalEntry', 'Създава нова счетоводна статия', () => import('./create-journal-entry').then(m => ({ default: m.buildCreateJournalEntryTool })));
register('manageHR', 'Управление на човешки ресурси', () => import('./manage-hr').then(m => ({ default: m.buildManageHRTool })));
register('manageInventory', 'Управление на складови наличности', () => import('./manage-inventory').then(m => ({ default: m.buildManageInventoryTool })));
register('generateVat', 'Генерира ДДС дневник и справка', () => import('./generate-vat').then(m => ({ default: m.buildGenerateVatTool })));
register('depreciateAssets', 'Изчислява амортизация на ДМА', () => import('./depreciate-assets').then(m => ({ default: m.buildDepreciateAssetsTool })));
register('autoApprove', 'Автоматично одобрение на документи', () => import('./auto-approve').then(m => ({ default: m.buildAutoApproveTool })));
register('processInbox', 'Обработва AI входящата кутия', () => import('./process-inbox').then(m => ({ default: m.buildProcessInboxTool })));
register('generateChart', 'Генерира графики и визуализации', () => import('./generate-chart').then(m => ({ default: m.buildGenerateChartTool })));
register('checkNraStatus', 'Проверява статус към НАП', () => import('./check-nra-status').then(m => ({ default: m.buildCheckNraStatusTool })));
register('checkNraLiabilities', 'Проверява задължения към НАП', () => import('./check-nra-liabilities').then(m => ({ default: m.buildCheckNraLiabilitiesTool })));
register('getFinancialSummary', 'Извлича финансово резюме', () => import('./get-financial-summary').then(m => ({ default: m.buildGetFinancialSummaryTool })));
register('searchDocuments', 'Търси документи в базата', () => import('./search-documents').then(m => ({ default: m.buildSearchDocumentsTool })));
