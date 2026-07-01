import { NextRequest } from 'next/server';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedTenant();
  if (!auth.ok) return auth.response;

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    return new Response('Липсва ключ за гласово разпознаване', { status: 500 });
  }

  return new Response(null, {
    status: 101,
    headers: {
      Upgrade: 'websocket',
      'Sec-WebSocket-Protocol': 'deepgram',
    },
  });
}
