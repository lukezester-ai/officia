import { NextRequest } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { ReportEngine } from '@/lib/accounting/report-engine';

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenant();

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
    const message = error instanceof Error ? error.message : "";
    if (message === "Not authenticated" || message === "Inactive membership" || message === "Tenant access denied" || message.startsWith("Потребителят")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json({ error: "Failed to generate cash flow report" }, { status: 500 });
  }
}
