import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';

export { isPublicApiPath } from '@/lib/auth/public-api';

export async function requireApiSession() {
  try {
    return { ctx: await requireTenant(), response: null as NextResponse | null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Not authenticated') || message.includes('Неоторизиран')) {
      return {
        ctx: null,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    console.error('[api-guard]', message);
    return {
      ctx: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
}

export function publicClientError(status: number, error: string, requestId?: string) {
  return NextResponse.json({ error, requestId }, { status });
}
