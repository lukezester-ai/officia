import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';

export async function GET() {
  const auth = await getAuthenticatedTenant();
  if (!auth.ok) return auth.response;

  try {
    const items = await db
      .select()
      .from(aiInboxItems)
      .where(
        and(
          eq(aiInboxItems.tenantId, auth.tenantId),
          eq(aiInboxItems.type, 'ai_approval_required'),
          eq(aiInboxItems.status, 'open'),
        ),
      )
      .orderBy(desc(aiInboxItems.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('AI approvals API error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load AI approvals' }, { status: 500 });
  }
}
