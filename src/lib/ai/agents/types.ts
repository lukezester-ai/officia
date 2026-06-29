export type ExecutorDomain = 'accounting' | 'banking' | 'hr' | 'documents';

export type ExecutorToolKey =
  | 'createInvoice'
  | 'createExpense'
  | 'createJournalEntry'
  | 'generateVat'
  | 'depreciateAssets'
  | 'getFinancialSummary'
  | 'generateChart'
  | 'checkNraStatus'
  | 'checkNraLiabilities'
  | 'bankMatch'
  | 'manageHR'
  | 'autoApprove'
  | 'searchDocuments'
  | 'processInbox';

export type ExecutorAgent = {
  id: ExecutorDomain;
  label: string;
  description: string;
  toolKeys: ExecutorToolKey[];
  keywords: string[];
  systemPrompt: string;
};

export type OrchestratorSubTask = {
  domain: ExecutorDomain;
  suggestedTool: ExecutorToolKey;
  requiresHumanReview: boolean;
  reason: string;
};

export type OrchestratorRouting = {
  routedTo: ExecutorDomain | 'multiple' | 'general';
  summary: string;
  subTasks: OrchestratorSubTask[];
  activeDomains: ExecutorDomain[];
  confidence?: number;
  intentSummary?: string;
  reasoning?: string;
  routingMode?: 'llm' | 'keywords' | 'hybrid';
  suggestedToolKeys?: ExecutorToolKey[];
};

/** Backward-compatible shape used by legacy OrchestratorAgent wrapper */
export type OrchestratorResult = {
  routedTo: OrchestratorRouting['routedTo'];
  response: string;
  subTasks?: OrchestratorSubTask[];
};
