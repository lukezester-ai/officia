// @ts-nocheck
import { NextResponse } from 'next/server';
import { requireBearerSecret } from '@/lib/api/security';

export async function POST(req: Request) {
  try {
    const unauthorized = requireBearerSecret(req, process.env.AI_WEBHOOK_SECRET);
    if (unauthorized) return unauthorized;
    const body = await req.json();
    const { event, payload } = body;

    console.log("Received AI Webhook:", event);

    if (event === 'document.uploaded') {
      // Пример: Автоматично стартиране на анализ на документ
      console.log("Triggering document analysis for", payload.documentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
