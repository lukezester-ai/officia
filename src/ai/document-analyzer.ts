export interface ExtractedTask {
  title: string;
  description: string;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
}

export interface DocumentAnalysisResult {
  metadata: {
    parties: string[];
    contractDate: string;
    value: string;
  };
  suggestedTasks: ExtractedTask[];
}

export class DocumentAnalyzer {
  static async analyzeText(text: string): Promise<DocumentAnalysisResult> {
    // In production, this would call OpenAI/Anthropic structured outputs
    // e.g. using \`generateObject\` from 'ai'
    
    // Simulating AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Mock logic based on keywords to simulate understanding context
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('наем') || lowerText.includes('rent')) {
      return {
        metadata: {
          parties: ['Officia EOOD', 'Real Estate BG OOD'],
          contractDate: '2026-06-01',
          value: '1200 EUR/month'
        },
        suggestedTasks: [
          {
            title: 'Плащане на наем',
            description: 'Извършване на месечно плащане на наем към Real Estate BG OOD съгласно договора.',
            dueDate: '2026-06-05',
            priority: 'high'
          },
          {
            title: 'Подписване на протокол',
            description: 'Двустранно подписване на приемо-предавателен протокол за офис помещението.',
            dueDate: '2026-06-01',
            priority: 'medium'
          }
        ]
      };
    }
    
    if (lowerText.includes('трудов') || lowerText.includes('служебен')) {
      return {
        metadata: {
          parties: ['Официа', 'Нов Служител'],
          contractDate: new Date().toISOString().split('T')[0],
          value: 'Заплата'
        },
        suggestedTasks: [
          {
            title: 'Регистрация в НАП',
            description: 'Подаване на уведомление в НАП в 3-дневен срок от сключването на договора.',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'high'
          },
          {
            title: 'Създаване на профил',
            description: 'Създаване на email и достъп до системите за новия служител.',
            dueDate: null,
            priority: 'medium'
          }
        ]
      };
    }

    // Default mock response
    return {
      metadata: {
        parties: ['Unknown Party A', 'Unknown Party B'],
        contractDate: new Date().toISOString().split('T')[0],
        value: 'N/A'
      },
      suggestedTasks: [
        {
          title: 'Преглед на документа',
          description: 'Да се прегледа новокаченият документ за важни клаузи и срокове.',
          dueDate: null,
          priority: 'medium'
        }
      ]
    };
  }
}
