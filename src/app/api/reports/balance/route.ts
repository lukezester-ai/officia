import { NextRequest } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { ReportEngine } from '@/lib/accounting/report-engine';

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenant();

    const { searchParams } = new URL(req.url);
    const periodEndParam = searchParams.get('periodEnd');
    
    if (!periodEndParam) {
      return Response.json({ error: "Missing periodEnd parameter" }, { status: 400 });
    }

    const periodEnd = new Date(periodEndParam);
    const report = await ReportEngine.generateBalanceSheet(tenantId, periodEnd);

    return Response.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Not authenticated" || message === "Inactive membership" || message === "Tenant access denied" || message.startsWith("Потребителят")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json({ error: "Failed to generate balance sheet" }, { status: 500 });
  }
}
