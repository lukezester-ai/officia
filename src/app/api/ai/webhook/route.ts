import { NextResponse } from 'next/server';

function isAuthorizedWebhook(req: Request) {
  const secret = process.env.AI_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedWebhook(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { event, payload } = body;

    console.log('Received AI Webhook:', event);

    if (event === 'document.uploaded') {
      console.log('Triggering document analysis for', payload.documentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Вътрешна грешка на сървъра' }, { status: 500 });
  }
}
