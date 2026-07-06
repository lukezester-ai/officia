import { NextRequest } from 'next/server';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import {
  buildOrchestratorSystemPrompt,
  buildRoutedChatTools,
  prepareOrchestratedChat,
} from '@/lib/ai/agents';
import { getAnthropicChatModel } from '@/lib/ai/model';
import { requireTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/api/rate-limit';
import {
  formatConversationMemory,
  getConversationHistory,
  saveConversationMessage,
} from '@/lib/ai/memory/conversation-store';
import { retrieveRelevantContext } from '@/lib/ai/rag/retriever';

const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TEXT_LENGTH = 15_000;

function getMessageText(message: any) {
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.parts)) {
    return message.parts
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
  }
  return '';
}

function getLastUserMessageText(messages: any[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return getMessageText(messages[index]);
    }
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { userId, tenantId, user } = await requireTenant();
    const dbUserId = user.id; // internal UUID, not Clerk's user_xxx

    const rateLimit = await checkRateLimit(`ai-chat:${userId}`, MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.success) {
      return new Response('Too many requests. Please try again later.', {
        status: 429,
        headers: { 'X-RateLimit-Reset': rateLimit.reset.toString() },
      });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Невалидни данни за съобщенията', { status: 400 });
    }

    const totalLength = messages.reduce((sum: number, message: any) => sum + getMessageText(message).length, 0);

    if (totalLength > MAX_TEXT_LENGTH) {
      return new Response(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`, { status: 413 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response('AI provider is not configured', { status: 503 });
    }

    const lastUserText = getLastUserMessageText(messages);
    const persistedHistory = await getConversationHistory(tenantId, dbUserId, 20);
    const memoryContext = formatConversationMemory(persistedHistory);

    let documentContext = '';
    try {
      documentContext = await retrieveRelevantContext(lastUserText, tenantId);
    } catch (error) {
      console.error('RAG retrieval failed; continuing without document context:', error);
    }

    const { routing, tenantSnapshot } = await prepareOrchestratedChat(
      lastUserText,
      tenantId,
      dbUserId,
      messages,
    );
    const tools = buildRoutedChatTools(routing, { tenantId, userId: dbUserId });
    const system = [
      buildOrchestratorSystemPrompt(tenantId, routing, tenantSnapshot),
      memoryContext
        ? `\nДългосрочна памет от предишни разговори:\n${memoryContext}`
        : '',
      documentContext
        ? `\nРелевантен контекст от фирмени документи:\n${documentContext}\nЦитирай заглавието на документа, когато използваш този контекст.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    await saveConversationMessage(tenantId, dbUserId, 'user', lastUserText);

    const result = streamText({
      model: getAnthropicChatModel(),
      system,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      onFinish: async ({ text, totalUsage, finishReason }) => {
        await saveConversationMessage(tenantId, dbUserId, 'assistant', text, {
          finishReason,
          inputTokens: totalUsage.inputTokens,
          outputTokens: totalUsage.outputTokens,
        });
      },
    });

    return result.toUIMessageStreamResponse({ originalMessages: messages });
  } catch (error: any) {
    console.error('Chat API error:', error);
    if (error.message === 'Not authenticated' || error.message === 'User not found in local database' || error.message === 'User does not belong to any tenant') {
      return new Response('Forbidden or Unauthorized', { status: 403 });
    }
    return new Response('Вътрешна грешка на сървъра', { status: 500 });
  }
}
