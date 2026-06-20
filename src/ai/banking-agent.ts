// @ts-nocheck
export interface BankingAnalysisResult {
  intent: 'reconciliation' | 'categorization' | 'anomaly_detection' | 'unknown';
  transactionsProcessed?: number;
  anomaliesFound?: string[];
  reconciledInvoices?: string[];
  suggestedAction: string;
}

export class BankingAgent {
  static async processRequest(text: string): Promise<BankingAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    const lowerText = text.toLowerCase();

    if (lowerText.includes('извлечение') || lowerText.includes('reconcile') || lowerText.includes('сравни')) {
      return {
        intent: 'reconciliation',
        transactionsProcessed: 142,
        reconciledInvoices: ['INV-0001', 'INV-0023'],
        suggestedAction: 'Свързани са 142 транзакции. 2 фактури бяха автоматично маркирани като "Платени".'
      };
    }

    if (lowerText.includes('категоризирай') || lowerText.includes('разходи')) {
      return {
        intent: 'categorization',
        suggestedAction: 'Банковите транзакции за месеца са разпределени по счетоводни сметки (напр. такси, софтуер).'
      };
    }

    if (lowerText.includes('аномали') || lowerText.includes('странни')) {
      return {
        intent: 'anomaly_detection',
        anomaliesFound: ['Дублирано плащане към Еконт от 45.50 лв на 12-ти май.'],
        suggestedAction: 'Открита е аномалия: потенциално двойно плащане. Прегледайте извлечението.'
      };
    }

    return {
      intent: 'unknown',
      suggestedAction: 'Не успях да разбера банковата команда. Моля, прикачете извлечение или уточнете.'
    };
  }
}
