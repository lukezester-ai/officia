// @ts-nocheck
export interface HRAnalysisResult {
  intent: 'leave_request' | 'cv_parse' | 'onboarding' | 'unknown';
  employeeName?: string;
  leaveDays?: number;
  startDate?: string;
  endDate?: string;
  extractedSkills?: string[];
  suggestedAction: string;
}

export class HRAgent {
  static async processRequest(text: string): Promise<HRAnalysisResult> {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI delay
    const lowerText = text.toLowerCase();

    if (lowerText.includes('отпуск') || lowerText.includes('почивка') || lowerText.includes('болничен')) {
      return {
        intent: 'leave_request',
        employeeName: 'Иван Иванов', // Simulated extraction
        leaveDays: 3,
        startDate: new Date().toISOString().split('T')[0],
        suggestedAction: 'Създай запис за отпуск (Leave Request) и уведоми мениджъра за одобрение.'
      };
    }

    if (lowerText.includes('cv') || lowerText.includes('автобиография') || lowerText.includes('кандидат')) {
      return {
        intent: 'cv_parse',
        employeeName: 'Мария Петрова',
        extractedSkills: ['React', 'Next.js', 'Typescript'],
        suggestedAction: 'Регистрирай кандидата в системата и насрочи интервю.'
      };
    }

    if (lowerText.includes('договор') || lowerText.includes('назначи')) {
      return {
        intent: 'onboarding',
        employeeName: 'Нов Служител',
        suggestedAction: 'Генерирай трудов договор и създай профил в Active Directory.'
      };
    }

    return {
      intent: 'unknown',
      suggestedAction: 'Не успях да разпозная HR команда. Моля, уточнете.'
    };
  }
}
