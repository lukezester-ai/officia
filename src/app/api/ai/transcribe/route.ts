import { NextRequest } from 'next/server';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (!auth.ok) return auth.response;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const incomingForm = await req.formData();
    const file = incomingForm.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const openAiForm = new FormData();
    openAiForm.append('file', file, file.name || 'audio.webm');
    openAiForm.append('model', 'whisper-1');
    openAiForm.append('language', 'bg');
    openAiForm.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiForm,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || 'Transcription failed';
      return Response.json({ error: message }, { status: response.status });
    }

    return Response.json({ text: payload.text || '' });
  } catch (error) {
    console.error('Transcription error:', error);
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return Response.json({ error: 'Transcription failed', details: message }, { status: 500 });
  }
}
