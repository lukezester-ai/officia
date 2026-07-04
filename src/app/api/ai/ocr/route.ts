import { NextResponse } from 'next/server';
import {
  extractTextFromPdfBuffer,
  processDocumentImage,
  processDocumentText,
} from '@/lib/ai/agents/ocr';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';
import { withRateLimit } from '@/lib/api/rate-limit';

const MAX_BASE64_CHARS = 8_000_000; // ~6 MB file
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export async function POST(req: Request) {
  const auth = await getAuthenticatedTenant();
  if (!auth.ok) return auth.response;

  return withRateLimit(
    `ocr:${auth.tenantId}`,
    async () => {
      try {
        const body = await req.json();
        const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

        if (!imageBase64) {
          return NextResponse.json({ error: 'No document provided' }, { status: 400 });
        }

        if (imageBase64.length > MAX_BASE64_CHARS) {
          return NextResponse.json({ error: 'File too large (max ~6 MB)' }, { status: 413 });
        }

        const resolvedMime = mimeType || 'image/jpeg';
        if (!ALLOWED_MIMES.has(resolvedMime)) {
          return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          return NextResponse.json(
            { error: 'OCR service is not configured. Set ANTHROPIC_API_KEY.' },
            { status: 503 },
          );
        }

        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

        let extractedData;
        if (resolvedMime === 'application/pdf') {
          const buffer = Buffer.from(cleanBase64, 'base64');
          const text = await extractTextFromPdfBuffer(buffer);
          if (!text) {
            return NextResponse.json(
              { error: 'PDF без извличаем текст. Качете JPG/PNG снимка на документа.' },
              { status: 422 },
            );
          }
          extractedData = await processDocumentText(text);
        } else {
          extractedData = await processDocumentImage(cleanBase64, resolvedMime);
        }

        return NextResponse.json(extractedData);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to process document';
        console.error('OCR Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
      }
    },
    15,
    60_000,
  );
}
