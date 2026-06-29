import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/lib/ai/agents/ocr';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedTenant();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'OCR service is not configured. Set ANTHROPIC_API_KEY to enable document extraction.',
        },
        { status: 503 },
      );
    }

    const extractedData = await processDocumentImage(imageBase64, mimeType || 'image/jpeg');

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process document' }, { status: 500 });
  }
}
