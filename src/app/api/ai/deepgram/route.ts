import { NextRequest } from 'next/server';
import { requireApiUser } from '@/lib/api/security';
import { moduleDeniedResponse } from '@/lib/billing/entitlements';

export async function GET() {
  const { response } = await requireApiUser();
  if (response) return response;
  const denied = await moduleDeniedResponse('ai');
  if (denied) return denied;
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    return new Response('Missing Deepgram API Key', { status: 500 });
  }

  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Sec-WebSocket-Protocol': 'deepgram',
    },
  });
}
