// @ts-nocheck
import { AccountingAnalyzer } from './accounting-analyzer';
import { HRAgent } from './hr-agent';
import { BankingAgent } from './banking-agent';
import { LegalAgent } from './legal-agent';
import { AnalystAgent } from './analyst-agent';

export interface OrchestratorResult {
  routedTo: 'accounting' | 'hr' | 'banking' | 'legal' | 'analyst' | 'multiple' | 'general';
  response: string;
  subTasks?: any[];
}

export class OrchestratorAgent {
  static async routeAndProcess(text: string): Promise<OrchestratorResult> {
    const lowerText = text.toLowerCase();
    
    // 1. Intent Classification Logic (Simplified router)
    const isAccounting = lowerText.includes('фактура') || lowerText.includes('осчетоводи');
    const isHR = lowerText.includes('отпуск') || lowerText.includes('cv') || lowerText.includes('служител');
    const isBanking = lowerText.includes('банка') || lowerText.includes('извлечение') || lowerText.includes('reconcile');
    const isLegal = lowerText.includes('договор') || lowerText.includes('nda') || lowerText.includes('правн');
    const isAnalyst = lowerText.includes('отчет') || lowerText.includes('печалба') || lowerText.includes('справка');

    // Handle complex multi-agent request (e.g., "Осчетоводи фактурата и пусни отпуск на Иван")
    if ((isAccounting && isHR) || text.includes(' и ')) {
      // Simulate parallel processing
      const [accRes, hrRes] = await Promise.all([
        AccountingAnalyzer.analyzeText(text),
        HRAgent.processRequest(text)
      ]);
      
      return {
        routedTo: 'multiple',
        response: `Диригентът разпредели задачата:\n\n1. Счетоводство: Фактурата е разпозната (${accRes.invoiceNumber}) и ще бъде отнесена към ${accRes.suggestedAccount}.\n2. Човешки Ресурси: ${hrRes.suggestedAction}`,
      };
    }

    // Single Routing
    if (isAccounting) {
      const res = await AccountingAnalyzer.analyzeText(text);
      return {
        routedTo: 'accounting',
        response: `Счетоводен Агент: Обработих фактура ${res.invoiceNumber} от ${res.supplierName}. Предлагам контировка: ${res.suggestedAccount}.`
      };
    }

    if (isHR) {
      const res = await HRAgent.processRequest(text);
      return {
        routedTo: 'hr',
        response: `HR Агент: ${res.suggestedAction}`
      };
    }

    if (isBanking) {
      const res = await BankingAgent.processRequest(text);
      return {
        routedTo: 'banking',
        response: `Банков Агент: ${res.suggestedAction}`
      };
    }

    if (isLegal) {
      const res = await LegalAgent.processRequest(text);
      return {
        routedTo: 'legal',
        response: `Правен Агент: ${res.suggestedAction}`
      };
    }

    if (isAnalyst) {
      const res = await AnalystAgent.processRequest(text);
      return {
        routedTo: 'analyst',
        response: `Анализатор Агент: ${res.suggestedAction}`
      };
    }

    // Default Fallback
    return {
      routedTo: 'general',
      response: 'Общ Асистент: Не успях да насоча заявката ви към специализиран агент. Мога ли да ви помогна с обща информация?'
    };
  }
}
