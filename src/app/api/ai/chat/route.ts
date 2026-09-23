import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { findRelevantTaxLaws, buildRagSystemPrompt } from '@/lib/ai/rag/tax-rag';
import { requireApiSession, publicClientError } from '@/lib/auth/api-guard';
import { rejectOversizedRequest } from '@/lib/api/security';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_BODY_BYTES = 32_000;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const oversized = rejectOversizedRequest(req, MAX_BODY_BYTES);
    if (oversized) return oversized;

    const { ctx, response } = await requireApiSession();
    if (response || !ctx) return response!;

    const now = Date.now();
    const rl = rateLimitMap.get(ctx.tenantId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    if (now > rl.resetTime) {
      rl.count = 1;
      rl.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      rl.count += 1;
    }
    rateLimitMap.set(ctx.tenantId, rl);
    if (rl.count > MAX_REQUESTS_PER_WINDOW) {
      return publicClientError(429, 'Too many requests', requestId);
    }

    const body = await req.json().catch(() => null);
    if (!body?.messages || !Array.isArray(body.messages)) {
      return publicClientError(400, 'Invalid request', requestId);
    }
    if (body.messages.length > MAX_MESSAGES) {
      return publicClientError(400, 'Too many messages', requestId);
    }

    const coreMessages = body.messages
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string'
          ? m.content
          : (m.parts?.find((p: any) => p?.type === 'text')?.text ?? ''),
      }))
      .filter((m: any) => typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m: any) => ({
        ...m,
        content: m.content.slice(0, MAX_MESSAGE_CHARS),
      }));

    if (coreMessages.length === 0) {
      return publicClientError(400, 'Empty message', requestId);
    }

    const lastUserMessage = coreMessages.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage ? lastUserMessage.content : '';
    const relevantLaws = userQuery ? findRelevantTaxLaws(userQuery) : [];
    const baseSystemPrompt = 'Ти си Officia AI — интелигентен офис асистент за български фирми. Отговаряй винаги на български език, ясно и професионално. Помагаш с въпроси за счетоводство, ДДС, ТРЗ, фактури, складово стопанство и бизнес процеси.';
    const finalSystemPrompt = buildRagSystemPrompt(baseSystemPrompt, relevantLaws);

    const model = (process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5') as any;
    const { text } = await generateText({
      model: anthropic(model),
      system: finalSystemPrompt,
      messages: coreMessages,
      maxOutputTokens: 2048,
      abortSignal: AbortSignal.timeout(45_000),
    });

    return NextResponse.json({ response: text, requestId });
  } catch (err: any) {
    console.error('[AI Chat Error]', requestId, err?.message || err);
    return publicClientError(503, 'AI service temporarily unavailable', requestId);
  }
}
