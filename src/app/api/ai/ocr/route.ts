import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/lib/ai/agents/ocr';
import { consumeRateLimit } from '@/lib/api/rate-limit';
import { rejectOversizedRequest, requireApiUser } from '@/lib/api/security';

const OCR_LIMIT_PER_MINUTE = 10;

export async function POST(req: Request) {
  try {
    const { userId, response } = await requireApiUser();
    if (response || !userId) return response;
    const tooLarge = rejectOversizedRequest(req, 10 * 1024 * 1024);
    if (tooLarge) return tooLarge;
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const hit = consumeRateLimit(`ocr:${userId}`, OCR_LIMIT_PER_MINUTE);
    if (!hit.ok) {
      return NextResponse.json({ error: 'Твърде много заявки за разпознаване. Опитайте след малко.' }, { status: 429 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'OCR услугата не е конфигурирана' }, { status: 503 });
    }

    const extractedData = await processDocumentImage(imageBase64, mimeType || 'image/jpeg');
    
    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process document' }, { status: 500 });
  }
}
