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
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    if (!startParam || !endParam) {
      return Response.json({ error: "Missing start or end parameter" }, { status: 400 });
    }

    const start = new Date(startParam);
    const end = new Date(endParam);
    const report = await ReportEngine.generateCashFlow(tenantId, start, end);

    return Response.json(report);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate cash flow report" }, { status: 500 });
  }
}
