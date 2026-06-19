// @ts-nocheck
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ReportEngine } from '@/lib/accounting/report-engine';

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    const tenantId = orgId || userId;

    if (!tenantId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodEndParam = searchParams.get('periodEnd');
    
    if (!periodEndParam) {
      return Response.json({ error: "Missing periodEnd parameter" }, { status: 400 });
    }

    const periodEnd = new Date(periodEndParam);
    const report = await ReportEngine.generateBalanceSheet(tenantId, periodEnd);

    return Response.json(report);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate balance sheet" }, { status: 500 });
  }
}
