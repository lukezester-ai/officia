import { NextRequest } from 'next/server';

export async function GET() {
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
