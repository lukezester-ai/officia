import { randomUUID } from 'node:crypto';
import { getAiCapability } from '@/lib/ai/automation/registry';
import {
  runBankSyncPipeline,
  runDocumentLifecyclePipeline,
  runMonthClosePipeline,
  type OrchestrationPlan,
} from '@/lib/ai/orchestration';

export interface OrchestratorSubTask {
  domain: 'accounting' | 'hr' | 'banking' | 'legal' | 'analyst' | 'documents' | 'tax' | 'orchestrator' | 'inventory';
  suggestedTool: string;
  requiresHumanReview: boolean;
  reason: string;
  autoExecute: boolean;
}

export interface OrchestratorResult {
  routedTo: OrchestratorSubTask['domain'] | 'multiple' | 'general' | 'compliance';
  response: string;
  intent: string;
  confidence: number;
  correlationId: string;
  subTasks?: OrchestratorSubTask[];
  execution?: unknown;
}

const routingRules: Array<{
  domain: OrchestratorSubTask['domain'];
  tool: string;
  keywords: string[];
  reason: string;
  autoExecute: boolean;
  weight: number;
}> = [
  {
    domain: 'orchestrator',
    tool: 'runMonthClose',
    keywords: ['приключване', 'month close', 'затвори месеца', 'месечно', 'dds дневник', 'ддс дневник', 'амортизац'],
    reason: 'Заявка за месечно приключване — координира ДДС и амортизации.',
    autoExecute: true,
    weight: 3,
  },
  {
    domain: 'banking',
    tool: 'runBankSync',
    keywords: ['bank', 'банка', 'извлечение', 'reconcile', 'равнение', 'плащане', 'превод', 'съпостав'],
    reason: 'Банково равнение / съпоставяне на преводи.',
    autoExecute: true,
    weight: 2,
  },
  {
    domain: 'inventory',
    tool: 'manageInventory',
    keywords: [
      'склад',
      'складов',
      'наличност',
      'наличност',
      'изписване',
      'изпиши',
      'заприход',
      'заскладяване',
      'артикул',
      'barcode',
      'баркод',
      'sku',
      'inventory',
      'сток',
      'стока',
      'номенклатура',
    ],
    reason: 'Склад: регистрация, изписване, наличности или баркод.',
    autoExecute: false,
    weight: 3,
  },
  {
    domain: 'accounting',
    tool: 'createInvoice',
    keywords: ['invoice', 'faktura', 'фактура', 'осчетоводи', 'счетовод', 'контиров', 'статия'],
    reason: 'Фактуриране или счетоводно контиране.',
    autoExecute: false,
    weight: 2,
  },
  {
    domain: 'tax',
    tool: 'generateVat',
    keywords: ['ддс', 'vat', 'здас', 'данъчен кредит', 'дневници'],
    reason: 'ДДС / данъчни дневници.',
    autoExecute: false,
    weight: 2,
  },
  {
    domain: 'hr',
    tool: 'manageHR',
    keywords: ['hr', 'служител', 'отпуск', 'болничен', 'заплат', 'трз', 'payroll'],
    reason: 'HR / ТРЗ / отпуски.',
    autoExecute: false,
    weight: 2,
  },
  {
    domain: 'documents',
    tool: 'searchDocuments',
    keywords: ['document', 'документ', 'архив', 'договор', 'receipt', 'касова', 'ocr'],
    reason: 'Документи / OCR / архив.',
    autoExecute: false,
    weight: 1,
  },
  {
    domain: 'analyst',
    tool: 'getFinancialSummary',
    keywords: ['report', 'отчет', 'справка', 'печалба', 'разходи', 'summary', 'chart', 'графика', 'cashflow', 'кешфлоу'],
    reason: 'Отчети и анализи.',
    autoExecute: false,
    weight: 1,
  },
  {
    domain: 'legal',
    tool: 'searchDocuments',
    keywords: ['legal', 'правен', 'риск', 'неустойка', 'nda', 'договорни'],
    reason: 'Правен преглед — само консултативен до човешко одобрение.',
    autoExecute: false,
    weight: 1,
  },
];

function planFromText(text: string): OrchestrationPlan {
  const lowerText = text.toLowerCase();
  const scored = routingRules
    .map((rule) => {
      const hits = rule.keywords.filter((keyword) => lowerText.includes(keyword)).length;
      return { rule, score: hits * rule.weight };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      routedTo: 'general',
      intent: 'general_help',
      confidence: 0.35,
      steps: [],
      response:
        'Не намерих достатъчно ясен домейн. Мога да насоча към счетоводство, банкиране, ДДС, HR, документи или месечно приключване — уточнете задачата.',
    };
  }

  // Take top distinct domains (max 3) for multi-agent plans
  const seen = new Set<string>();
  const top = [];
  for (const item of scored) {
    if (seen.has(item.rule.domain)) continue;
    seen.add(item.rule.domain);
    top.push(item);
    if (top.length >= 3) break;
  }

  const totalScore = top.reduce((sum, item) => sum + item.score, 0);
  const confidence = Math.min(0.95, 0.45 + totalScore * 0.08);

  const steps = top.map((item) => {
    const capability = getAiCapability(item.rule.tool);
    return {
      domain: item.rule.domain as OrchestrationPlan['steps'][number]['domain'],
      tool: item.rule.tool,
      reason: item.rule.reason,
      requiresHumanReview: capability?.requiresHumanReview ?? item.rule.domain === 'legal',
      autoExecute: item.rule.autoExecute,
    };
  });

  const routedTo: OrchestrationPlan['routedTo'] =
    steps.length === 1 ? (steps[0].domain as OrchestrationPlan['routedTo']) : 'multiple';
  const toolList = steps.map((step) => `${step.domain}:${step.tool}`).join(', ');
  const reviewNote = steps.some((step) => step.requiresHumanReview)
    ? ' Действия с запис минават през AI Inbox за човешки преглед.'
    : '';

  return {
    routedTo,
    intent: steps[0].tool,
    confidence,
    steps,
    response: `План: ${toolList} (увереност ${(confidence * 100).toFixed(0)}%).${reviewNote}`,
  };
}

export class OrchestratorAgent {
  /** Plan only — no side effects. */
  static async routeAndProcess(text: string): Promise<OrchestratorResult> {
    const correlationId = randomUUID();
    const plan = planFromText(text);
    const routedTo = (plan.routedTo === 'analytics' ? 'analyst' : plan.routedTo) as OrchestratorResult['routedTo'];
    return {
      routedTo,
      response: plan.response,
      intent: plan.intent,
      confidence: plan.confidence,
      correlationId,
      subTasks: plan.steps.map((step) => ({
        domain: (step.domain === 'analytics' ? 'analyst' : step.domain) as OrchestratorSubTask['domain'],
        suggestedTool: step.tool,
        requiresHumanReview: step.requiresHumanReview,
        reason: step.reason,
        autoExecute: step.autoExecute,
      })),
    };
  }

  /**
   * Plan + execute auto-safe pipelines (bank sync / month close).
   * Write-heavy tools stay as suggestions for the chat tool layer / approvals.
   */
  static async planAndExecute(
    text: string,
    opts: { tenantId: string; userId?: string | null; execute?: boolean } = { tenantId: '' },
  ): Promise<OrchestratorResult> {
    const base = await this.routeAndProcess(text);
    if (!opts.execute || !opts.tenantId) return base;

    const autoSteps = (base.subTasks || []).filter((task) => task.autoExecute);
    if (autoSteps.length === 0) return base;

    const results: unknown[] = [];
    for (const step of autoSteps) {
      if (step.suggestedTool === 'runBankSync') {
        results.push(await runBankSyncPipeline({ tenantId: opts.tenantId, userId: opts.userId, correlationId: base.correlationId }));
      } else if (step.suggestedTool === 'runMonthClose') {
        results.push(await runMonthClosePipeline({ tenantId: opts.tenantId, userId: opts.userId }));
      }
    }

    return {
      ...base,
      execution: results,
      response: `${base.response}\n\nАвтоматизация: изпълнени ${results.length} pipeline стъпки.`,
    };
  }

  /** Entry used by OCR upload handoff. */
  static async continueFromOcr(input: {
    tenantId: string;
    userId?: string | null;
    documentId?: string;
    ocr: Parameters<typeof runDocumentLifecyclePipeline>[0]['ocr'];
  }) {
    return runDocumentLifecyclePipeline(input);
  }
}
