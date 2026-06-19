// @ts-nocheck
import { NextResponse } from 'next/server';
import { processAIRequest } from '@/lib/ai/assistant';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    // Взимаме текущия потребител и tenant от Clerk
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // За демонстрация, ако orgId липсва, ползваме placeholder
    const tenantId = orgId || 'default_tenant';

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await processAIRequest({
      tenantId,
      userId,
      message,
      history,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in AI Chat Route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
