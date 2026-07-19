export type AgentDomain =
  | 'orchestrator'
  | 'documents'
  | 'accounting'
  | 'banking'
  | 'hr'
  | 'tax'
  | 'analytics'
  | 'analyst'
  | 'legal'
  | 'compliance'
  | 'inventory';

export type PipelineName =
  | 'document_lifecycle'
  | 'bank_sync'
  | 'month_close'
  | 'chat_route'
  | 'supervisor_sweep'
  | 'inventory_register'
  | 'inventory_issue'
  | 'inventory_receipt'
  | 'inventory_scan';

export type AiEventType =
  | 'document.uploaded'
  | 'document.ocr_completed'
  | 'document.draft_created'
  | 'accounting.journal_proposed'
  | 'accounting.journal_posted'
  | 'banking.match_proposed'
  | 'banking.match_confirmed'
  | 'tax.vat_proposed'
  | 'hr.leave_proposed'
  | 'inventory.product_registered'
  | 'inventory.product_received'
  | 'inventory.product_issued'
  | 'inventory.code_scanned'
  | 'inventory.stock_synced'
  | 'approval.queued'
  | 'approval.accepted'
  | 'approval.rejected'
  | 'pipeline.step'
  | 'pipeline.completed'
  | 'pipeline.failed';

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'waiting_approval';

export interface PipelineStep {
  key: string;
  domain: AgentDomain;
  label: string;
  status: PipelineStepStatus;
  result?: unknown;
  error?: string;
  requiresHumanReview?: boolean;
}

export interface AiEvent {
  type: AiEventType;
  tenantId: string;
  correlationId: string;
  userId?: string | null;
  sourceType?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
  message?: string;
}

export interface OrchestrationPlan {
  routedTo: AgentDomain | 'multiple' | 'general';
  intent: string;
  confidence: number;
  steps: Array<{
    domain: AgentDomain;
    tool: string;
    reason: string;
    requiresHumanReview: boolean;
    autoExecute: boolean;
  }>;
  response: string;
}
