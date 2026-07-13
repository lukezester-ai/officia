import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@clerk/nextjs/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Не сте влезли в системата.' }, { status: 401 });
    }

    // Rate limiting
    const now = Date.now();
    const rl = rateLimitMap.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    if (now > rl.resetTime) { rl.count = 1; rl.resetTime = now + RATE_LIMIT_WINDOW_MS; }
    else rl.count++;
    rateLimitMap.set(userId, rl);
    if (rl.count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json({ error: 'Твърде много заявки. Изчакайте минута.' }, { status: 429 });
    }

    // Parse body
    const body = await req.json().catch(() => null);
    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
    }

    // Build CoreMessages – filter only user/assistant with non-empty content
    const coreMessages = body.messages
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string'
          ? m.content
          : (m.parts?.find((p: any) => p?.type === 'text')?.text ?? ''),
      }))
      .filter((m: any) => m.content.trim().length > 0);

    if (coreMessages.length === 0) {
      return NextResponse.json({ error: 'Празно съобщение.' }, { status: 400 });
    }

    // Call Anthropic
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      system: 'Ти си Officia AI — интелигентен офис асистент за български фирми. Отговаряй винаги на български език, ясно и професионално. Помагаш с въпроси за счетоводство, ДДС, ТРЗ, фактури, складово стопанство и бизнес процеси.',
      messages: coreMessages,
      maxOutputTokens: 2048,
    });

    return NextResponse.json({ response: text });

  } catch (err: any) {
    console.error('[AI Chat Error]', err?.message || err);
    return NextResponse.json(
      { error: `Грешка при свързване с AI: ${err?.message || 'Непозната грешка'}` },
      { status: 500 }
    );
  }
}
