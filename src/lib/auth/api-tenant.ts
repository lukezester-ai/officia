import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getAuthenticatedTenant() {
  try {
    const tenant = await requireTenant();
    return { ok: true as const, ...tenant };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    if (message === 'Not authenticated') {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    return {
      ok: false as const,
      response: NextResponse.json({ error: message }, { status: 403 }),
    };
  }
}
