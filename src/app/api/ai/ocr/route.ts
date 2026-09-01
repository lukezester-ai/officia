// @ts-nocheck
import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/lib/ai/agents/ocr';
import { rejectOversizedRequest, requireApiUser } from '@/lib/api/security';

export async function POST(req: Request) {
  try {
    const { response } = await requireApiUser();
    if (response) return response;
    const tooLarge = rejectOversizedRequest(req, 10 * 1024 * 1024);
    if (tooLarge) return tooLarge;
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
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
