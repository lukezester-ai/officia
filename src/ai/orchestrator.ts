import { getAiCapability } from '@/lib/ai/automation/registry';

export interface OrchestratorSubTask {
  domain: 'accounting' | 'hr' | 'banking' | 'legal' | 'analyst' | 'documents';
  suggestedTool: string;
  requiresHumanReview: boolean;
  reason: string;
}

export interface OrchestratorResult {
  routedTo: 'accounting' | 'hr' | 'banking' | 'legal' | 'analyst' | 'documents' | 'multiple' | 'general';
  response: string;
  subTasks?: OrchestratorSubTask[];
}

const routingRules: Array<{
  domain: OrchestratorSubTask['domain'];
  tool: string;
  keywords: string[];
  reason: string;
}> = [
  {
    domain: 'accounting',
    tool: 'createInvoice',
    keywords: ['invoice', 'faktura', 'фактура', 'осчетоводи', 'счетовод'],
    reason: 'The request looks related to invoice creation or accounting posting.',
  },
  {
    domain: 'banking',
    tool: 'bankMatch',
    keywords: ['bank', 'банка', 'извлечение', 'reconcile', 'плащане', 'превод'],
    reason: 'The request looks related to bank reconciliation or payment matching.',
  },
  {
    domain: 'hr',
    tool: 'manageHR',
    keywords: ['hr', 'служител', 'отпуск', 'болничен', 'cv', 'кандидат'],
    reason: 'The request looks related to employees, leave, hiring, or tasks.',
  },
  {
    domain: 'documents',
    tool: 'searchDocuments',
    keywords: ['document', 'документ', 'архив', 'договор', 'receipt', 'касова'],
    reason: 'The request looks related to document search or document analysis.',
  },
  {
    domain: 'analyst',
    tool: 'getFinancialSummary',
    keywords: ['report', 'отчет', 'справка', 'печалба', 'разходи', 'summary', 'chart', 'графика'],
    reason: 'The request looks related to reporting or analytics.',
  },
  {
    domain: 'legal',
    tool: 'searchDocuments',
    keywords: ['legal', 'правен', 'риск', 'неустойка', 'nda'],
    reason: 'The request looks related to legal review. It should stay advisory until reviewed by a person.',
  },
];

export class OrchestratorAgent {
  static async routeAndProcess(text: string): Promise<OrchestratorResult> {
    const lowerText = text.toLowerCase();
    const matches = routingRules.filter((rule) => rule.keywords.some((keyword) => lowerText.includes(keyword)));

    if (matches.length === 0) {
      return {
        routedTo: 'general',
        response: 'Не намерих достатъчно ясен домейн. Мога да насоча заявката към счетоводство, банкиране, HR, документи или анализи, ако добавите повече контекст.',
        subTasks: [],
      };
    }

    const subTasks = matches.map<OrchestratorSubTask>((match) => {
      const capability = getAiCapability(match.tool);
      return {
        domain: match.domain,
        suggestedTool: match.tool,
        requiresHumanReview: capability?.requiresHumanReview ?? true,
        reason: match.reason,
      };
    });

    const routedTo = subTasks.length === 1 ? subTasks[0].domain : 'multiple';
    const toolList = subTasks.map((task) => `${task.domain}:${task.suggestedTool}`).join(', ');
    const reviewList = subTasks.some((task) => task.requiresHumanReview)
      ? ' Някои действия изискват човешки преглед преди запис или финално одобрение.'
      : '';

    return {
      routedTo,
      response: `Заявката е маршрутизирана към: ${toolList}.${reviewList}`,
      subTasks,
    };
  }
}
