import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';
import { runAIAssistant } from '@/lib/ai/assistant';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Не сте влезли в системата.' }, { status: 401 });
    }

    const now = Date.now();
    const rl = rateLimitMap.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    if (now > rl.resetTime) {
      rl.count = 1;
      rl.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      rl.count++;
    }
    rateLimitMap.set(userId, rl);
    if (rl.count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json({ error: 'Твърде много заявки. Изчакайте минута.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Невалидни данни.' }, { status: 400 });
    }

    const coreMessages = body.messages
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content:
          typeof m.content === 'string'
            ? m.content
            : (m.parts?.find((p: any) => p?.type === 'text')?.text ?? ''),
      }))
      .filter((m: any) => m.content.trim().length > 0);

    if (coreMessages.length === 0) {
      return NextResponse.json({ error: 'Празно съобщение.' }, { status: 400 });
    }

    const lastUserMessage = coreMessages.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage ? lastUserMessage.content : '';
    const history = coreMessages.slice(0, -1);

    let tenantId = 'default';
    try {
      const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
      if (user?.tenantId) tenantId = user.tenantId;
    } catch {
      // keep default for demo environments
    }

    const result = await runAIAssistant(userQuery, tenantId, userId, history);

    return NextResponse.json({
      response: result.response,
      toolCalls: result.toolCalls,
      orchestration: result.orchestration,
      _ragDebug: result.ragUsed,
    });
  } catch (err: any) {
    console.error('[AI Chat Error]', err?.message || err);
    return NextResponse.json(
      { error: `Грешка при свързване с AI: ${err?.message || 'Непозната грешка'}` },
      { status: 500 },
    );
  }
}
