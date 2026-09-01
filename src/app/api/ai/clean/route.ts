// @ts-nocheck
import { NextResponse } from 'next/server';
import { runSystemCleanup } from '@/lib/ai/agents/cleaner';
import { requireBearerSecret } from '@/lib/api/security';

export async function POST(req: Request) {
  try {
    const unauthorized = requireBearerSecret(req, process.env.CRON_SECRET);
    if (unauthorized) return unauthorized;
    // В реална среда тук се проверява дали заявката идва от оторизиран Cron Job 
    // (напр. проверка на Authorization header или VERCEL_CRON_SECRET)
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Липсва ANTHROPIC_API_KEY в .env.local' }, { status: 500 });
    }

    const result = await runSystemCleanup();
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cleanup Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to run cleanup' }, { status: 500 });
  }
}
