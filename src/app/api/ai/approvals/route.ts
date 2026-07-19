import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { resolveAiApproval } from '@/lib/ai/orchestration';

export async function GET() {
  try {
    const { tenantId } = await requireTenant();

    const items = await db
      .select()
      .from(aiInboxItems)
      .where(
        and(
          eq(aiInboxItems.tenantId, tenantId),
          eq(aiInboxItems.type, 'ai_approval_required'),
          eq(aiInboxItems.status, 'open'),
        ),
      )
      .orderBy(desc(aiInboxItems.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('AI approvals API error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load AI approvals' }, { status: 500 });
  }
}

/**
 * Accept / reject an AI approval and execute the stored payload when accepted.
 * Body: { approvalId, decision: 'accepted' | 'rejected', note? }
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant();
    const body = await req.json().catch(() => null);

    if (!body?.approvalId || !['accepted', 'rejected'].includes(body.decision)) {
      return NextResponse.json(
        { success: false, error: 'Expected approvalId and decision (accepted|rejected)' },
        { status: 400 },
      );
    }

    const result = await resolveAiApproval({
      tenantId,
      userId,
      approvalId: body.approvalId,
      decision: body.decision,
      note: body.note,
    });

    return NextResponse.json({ ...result, success: result.success });
  } catch (error: any) {
    console.error('AI approvals resolve error:', error);
    const status = error?.message === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message || 'Unable to resolve approval' }, { status });
  }
}
