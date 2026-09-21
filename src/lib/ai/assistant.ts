import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

import { buildCreateInvoiceTool } from './tools/create-invoice';
import { buildBankMatchTool } from './tools/bank-match';

export async function runAIAssistant(
  userMessage: string,
  tenantId: string,
  userId: string,
  conversationHistory: any[] = []
) {
  const tools = {
    createInvoice: buildCreateInvoiceTool(tenantId, userId),
    bankMatch: buildBankMatchTool(tenantId),
  };

  const context = `Ти си Officia AI – интелигентен офис асистент за български фирми.
Бъди полезен, точен и професионален. Отговаряй винаги на български език.
Ако потребителят иска да създаде фактура, събери нужната информация (клиент, артикули, цени) и използвай инструмента createInvoice.
Текуща дата: ${new Date().toISOString()}`;

  try {
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-latest'),
      system: context,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      tools: tools,
    });

    return {
      response: result.text,
      toolCalls: result.toolCalls,
    };
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
}
