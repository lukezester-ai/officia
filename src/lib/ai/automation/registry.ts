export type AutomationLevel = 1 | 2 | 3 | 4 | 5;
export type AutomationRisk = 'low' | 'medium' | 'high';
export type AutomationMode = 'advisory' | 'read' | 'write' | 'workflow';

export type AiCapability = {
  key: string;
  label: string;
  owner: 'core' | 'accounting' | 'banking' | 'documents' | 'hr' | 'inventory' | 'tax' | 'compliance' | 'analytics';
  mode: AutomationMode;
  level: AutomationLevel;
  risk: AutomationRisk;
  requiresHumanReview: boolean;
  writesData: boolean;
  connectedSystems: string[];
  status: 'prototype' | 'live' | 'needs-hardening';
};

export const aiAgents: AiCapability[] = [
  {
    key: 'orchestrator',
    label: 'AI Диригент',
    owner: 'core',
    mode: 'workflow',
    level: 3,
    risk: 'medium',
    requiresHumanReview: false,
    writesData: false,
    connectedSystems: ['accounting', 'banking', 'hr', 'documents'],
    status: 'live',
  },
  {
    key: 'accountingExecutor',
    label: 'Счетоводство (изпълнител)',
    owner: 'accounting',
    mode: 'workflow',
    level: 3,
    risk: 'high',
    requiresHumanReview: true,
    writesData: true,
    connectedSystems: ['invoices', 'journal_entries', 'vat_journals', 'fixed_assets', 'reports'],
    status: 'live',
  },
  {
    key: 'bankingExecutor',
    label: 'Банкиране (изпълнител)',
    owner: 'banking',
    mode: 'workflow',
    level: 3,
    risk: 'high',
    requiresHumanReview: true,
    writesData: true,
    connectedSystems: ['bank_transactions', 'bank_accounts', 'invoices'],
    status: 'live',
  },
  {
    key: 'hrExecutor',
    label: 'HR (изпълнител)',
    owner: 'hr',
    mode: 'workflow',
    level: 3,
    risk: 'medium',
    requiresHumanReview: true,
    writesData: true,
    connectedSystems: ['employees', 'leave_requests', 'tasks', 'approvals'],
    status: 'live',
  },
  {
    key: 'documentsExecutor',
    label: 'Документи (изпълнител)',
    owner: 'documents',
    mode: 'workflow',
    level: 3,
    risk: 'medium',
    requiresHumanReview: true,
    writesData: true,
    connectedSystems: ['documents', 'ai_inbox_items'],
    status: 'live',
  },
];

export const aiTools: AiCapability[] = [
  { key: 'createInvoice', label: 'Create invoice', owner: 'accounting', mode: 'write', level: 3, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['counterparties', 'invoices', 'invoice_lines'], status: 'needs-hardening' },
  { key: 'getFinancialSummary', label: 'Financial summary', owner: 'analytics', mode: 'read', level: 3, risk: 'low', requiresHumanReview: false, writesData: false, connectedSystems: ['invoices', 'purchase_invoices', 'expenses'], status: 'live' },
  { key: 'searchDocuments', label: 'Search documents', owner: 'documents', mode: 'read', level: 3, risk: 'low', requiresHumanReview: false, writesData: false, connectedSystems: ['documents'], status: 'live' },
  { key: 'bankMatch', label: 'Bank matching', owner: 'banking', mode: 'write', level: 3, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['bank_transactions', 'bank_accounts', 'invoices'], status: 'needs-hardening' },
  { key: 'createExpense', label: 'Create expense', owner: 'accounting', mode: 'write', level: 3, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['expenses'], status: 'needs-hardening' },
  { key: 'createJournalEntry', label: 'Create journal entry', owner: 'accounting', mode: 'write', level: 3, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['journal_entries', 'account_plan'], status: 'needs-hardening' },
  { key: 'manageHR', label: 'Manage HR', owner: 'hr', mode: 'workflow', level: 3, risk: 'medium', requiresHumanReview: true, writesData: true, connectedSystems: ['employees', 'leave_requests', 'tasks'], status: 'needs-hardening' },
  { key: 'manageInventory', label: 'Manage inventory', owner: 'inventory', mode: 'write', level: 3, risk: 'medium', requiresHumanReview: true, writesData: true, connectedSystems: ['inventory_items', 'inventory_movements', 'tasks'], status: 'needs-hardening' },
  { key: 'generateVat', label: 'Generate VAT', owner: 'tax', mode: 'workflow', level: 3, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['vat_journals', 'invoices', 'purchase_invoices'], status: 'needs-hardening' },
  { key: 'depreciateAssets', label: 'Depreciate assets', owner: 'accounting', mode: 'write', level: 3, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['fixed_assets', 'journal_entries'], status: 'needs-hardening' },
  { key: 'autoApprove', label: 'Auto approve', owner: 'core', mode: 'workflow', level: 2, risk: 'high', requiresHumanReview: true, writesData: true, connectedSystems: ['approvals', 'leave_requests'], status: 'needs-hardening' },
  { key: 'processInbox', label: 'Process AI inbox', owner: 'core', mode: 'workflow', level: 3, risk: 'medium', requiresHumanReview: true, writesData: true, connectedSystems: ['ai_inbox_items'], status: 'needs-hardening' },
  { key: 'generateChart', label: 'Generate chart', owner: 'analytics', mode: 'advisory', level: 3, risk: 'low', requiresHumanReview: false, writesData: false, connectedSystems: ['dashboard'], status: 'live' },
  { key: 'checkNraStatus', label: 'Check NRA status', owner: 'compliance', mode: 'read', level: 2, risk: 'medium', requiresHumanReview: true, writesData: false, connectedSystems: ['nra'], status: 'prototype' },
  { key: 'checkNraLiabilities', label: 'Check NRA liabilities', owner: 'compliance', mode: 'read', level: 2, risk: 'high', requiresHumanReview: true, writesData: false, connectedSystems: ['nra'], status: 'prototype' },
];

export const aiAutomationRegistry = {
  agents: aiAgents,
  tools: aiTools,
  summary: {
    agentCount: aiAgents.length,
    toolCount: aiTools.length,
    productionReadyToolCount: aiTools.filter((item) => item.status === 'live').length,
    writeToolCount: aiTools.filter((item) => item.writesData).length,
    humanReviewRequiredCount: aiTools.filter((item) => item.requiresHumanReview).length,
    averageToolLevel: Number((aiTools.reduce((sum, item) => sum + item.level, 0) / aiTools.length).toFixed(1)),
  },
};

export function getAiCapability(key: string) {
  return [...aiAgents, ...aiTools].find((item) => item.key === key) ?? null;
}
