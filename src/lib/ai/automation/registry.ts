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
    label: 'AI Orchestrator',
    owner: 'core',
    mode: 'workflow',
    level: 4,
    risk: 'medium',
    requiresHumanReview: true,
    writesData: true,
    connectedSystems: ['accounting', 'banking', 'hr', 'documents', 'analytics', 'tax', 'ai_inbox'],
    status: 'live',
  },
  {
    key: 'accountingAnalyzer',
    label: 'Accounting Analyzer',
    owner: 'accounting',
    mode: 'advisory',
    level: 2,
    risk: 'medium',
    requiresHumanReview: true,
    writesData: false,
    connectedSystems: ['invoices', 'journal_entries'],
    status: 'prototype',
  },
  {
    key: 'hrAgent',
    label: 'HR Agent',
    owner: 'hr',
    mode: 'advisory',
    level: 2,
    risk: 'medium',
    requiresHumanReview: true,
    writesData: false,
    connectedSystems: ['employees', 'leave_requests', 'tasks'],
    status: 'prototype',
  },
  {
    key: 'bankingAgent',
    label: 'Banking Agent',
    owner: 'banking',
    mode: 'advisory',
    level: 2,
    risk: 'high',
    requiresHumanReview: true,
    writesData: false,
    connectedSystems: ['bank_transactions', 'invoices'],
    status: 'prototype',
  },
  {
    key: 'legalAgent',
    label: 'Legal Agent',
    owner: 'compliance',
    mode: 'advisory',
    level: 1,
    risk: 'high',
    requiresHumanReview: true,
    writesData: false,
    connectedSystems: ['documents', 'tasks'],
    status: 'prototype',
  },
  {
    key: 'analystAgent',
    label: 'Analyst Agent',
    owner: 'analytics',
    mode: 'read',
    level: 2,
    risk: 'low',
    requiresHumanReview: false,
    writesData: false,
    connectedSystems: ['reports', 'invoices', 'expenses'],
    status: 'prototype',
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
