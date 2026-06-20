// @ts-nocheck
export interface LegalAnalysisResult {
  intent: 'contract_review' | 'risk_assessment' | 'unknown';
  parties?: string[];
  deadlines?: string[];
  riskLevel?: 'Low' | 'Medium' | 'High';
  suggestedAction: string;
}

export class LegalAgent {
  static async processRequest(text: string): Promise<LegalAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const lowerText = text.toLowerCase();

    if (lowerText.includes('договор') || lowerText.includes('nda') || lowerText.includes('споразумение')) {
      return {
        intent: 'contract_review',
        parties: ['Officia Ltd', 'Client XYZ'],
        deadlines: ['2026-12-31 (Край на срока)'],
        riskLevel: 'Low',
        suggestedAction: 'Договорът е валиден. Добавих напомняне за изтичане на срока в календара.'
      };
    }

    if (lowerText.includes('риск') || lowerText.includes('глоб') || lowerText.includes('неустойк')) {
      return {
        intent: 'risk_assessment',
        riskLevel: 'High',
        suggestedAction: 'Внимание: В текста има клауза за неустойка в размер на 10% при забавяне. Препоръчва се преразглеждане от юрист.'
      };
    }

    return {
      intent: 'unknown',
      suggestedAction: 'Моля, прикачете правен документ за анализ.'
    };
  }
}
