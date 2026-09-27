import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { requireApiSession, publicClientError } from '@/lib/auth/api-guard';
import { rejectOversizedRequest } from '@/lib/api/security';
import { consumeRateLimit } from '@/lib/api/rate-limit';
import { moduleDeniedResponse } from '@/lib/billing/entitlements';
import { buildDocumentChatPrompt, type DocumentChatFields } from '@/lib/ai/document-chat-prompt';

const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_BODY_BYTES = 64_000;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const oversized = rejectOversizedRequest(req, MAX_BODY_BYTES);
    if (oversized) return oversized;

    const { ctx, response } = await requireApiSession();
    if (response || !ctx) return response!;
    const denied = await moduleDeniedResponse('ai');
    if (denied) return denied;

    const hit = consumeRateLimit(`ai-chat:${ctx.tenantId}`, MAX_REQUESTS_PER_WINDOW);
    if (!hit.ok) {
      return publicClientError(429, 'Твърде много заявки. Опитайте след малко.', requestId);
    }

    const body = await req.json().catch(() => null);
    const question = typeof body?.question === 'string' ? body.question.trim().slice(0, MAX_MESSAGE_CHARS) : '';
    if (!question) return publicClientError(400, 'Празен въпрос', requestId);

    const prompt = buildDocumentChatPrompt({
      documentName: typeof body?.documentName === 'string' ? body.documentName : '',
      extractedText: typeof body?.extractedText === 'string' ? body.extractedText : '',
      fields: (body?.fields ?? {}) as DocumentChatFields,
    });
    if (!prompt) {
      return publicClientError(400, 'Няма извлечен текст от този файл.', requestId);
    }

    const history = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const messages = history
      .map((message: { role?: string; content?: string }) => ({
        role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: typeof message.content === 'string' ? message.content.slice(0, MAX_MESSAGE_CHARS) : '',
      }))
      .filter((message: { content: string }) => message.content.trim().length > 0);
    messages.push({ role: 'user' as const, content: question });

    const model = (process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5') as any;
    const { text } = await generateText({
      model: anthropic(model),
      system: prompt,
      messages,
      maxOutputTokens: 800,
      abortSignal: AbortSignal.timeout(45_000),
    });

    return Response.json({ response: text, requestId });
  } catch (error: any) {
    console.error('[document-chat]', requestId, error?.message || error);
    return publicClientError(503, 'AI услугата не отговори.', requestId);
  }
}
