// @ts-nocheck
import { NextResponse } from 'next/server';
import { runStatutoryDeadlineCronEngine } from '@/lib/calendar/deadline-rule-engine';

/**
 * ТИКЕТ 6: Cron API Endpoint за български нормативни дедлайни (14-о число ДДС, 25-о число Осигуровки/ТРЗ, 30 юни ГФО).
 * Извиква се от Vercel Cron или външен таймер веднъж дневно / при влизане.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') || undefined;

    const result = await runStatutoryDeadlineCronEngine(tenantId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
