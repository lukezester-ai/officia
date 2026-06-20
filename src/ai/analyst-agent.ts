// @ts-nocheck
export interface AnalystAnalysisResult {
  intent: 'financial_summary' | 'expense_report' | 'unknown';
  metrics?: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  suggestedAction: string;
}

export class AnalystAgent {
  static async processRequest(text: string): Promise<AnalystAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const lowerText = text.toLowerCase();

    if (lowerText.includes('справка') || lowerText.includes('отчет') || lowerText.includes('p&l') || lowerText.includes('печалба')) {
      return {
        intent: 'financial_summary',
        metrics: {
          revenue: 125000,
          expenses: 84000,
          profit: 41000
        },
        suggestedAction: 'Генериран е финансов отчет за текущия месец. Нетната печалба е 41,000 лв.'
      };
    }

    if (lowerText.includes('разходи') || lowerText.includes('харчим')) {
      return {
        intent: 'expense_report',
        suggestedAction: 'Най-голямото пера от разходи този месец са "Заплати" (60%) и "Външни услуги" (15%).'
      };
    }

    return {
      intent: 'unknown',
      suggestedAction: 'Не съм сигурен какъв репорт търсите. Моля, попитайте за "Печалба", "Разходи" или "Кешфлоу".'
    };
  }
}
