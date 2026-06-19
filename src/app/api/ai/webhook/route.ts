import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, payload } = body;

    // TODO: Защита на webhook (напр. проверка на signature)

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
