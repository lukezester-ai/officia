import { NextResponse } from 'next/server';
import { runSystemCleanup } from '@/lib/ai/agents/cleaner';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';

function isAuthorizedCron(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedCron(req)) {
      const auth = await getAuthenticatedTenant();
      if (!auth.ok) return auth.response;
    }

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
