import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

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

const DocumentAnalysisSchema = z.object({
  metadata: z.object({
    parties: z.array(z.string()),
    contractDate: z.string(),
    value: z.string(),
  }),
  suggestedTasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    dueDate: z.string().nullable(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
});

export class DocumentAnalyzer {
  static async analyzeText(text: string): Promise<DocumentAnalysisResult> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Анализът на документа не е конфигуриран (ANTHROPIC_API_KEY).');
    }
    const { object } = await generateObject({
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'),
      schema: DocumentAnalysisSchema,
      prompt: `Analyze this Bulgarian legal/business document. Extract parties, contract date, value, and suggested follow-up tasks.
Document:
"""${text}"""`,
    });
    return object;
  }
}
