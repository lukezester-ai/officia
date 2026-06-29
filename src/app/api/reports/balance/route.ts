import { NextRequest } from 'next/server';
import { ReportEngine } from '@/lib/accounting/report-engine';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const periodEndParam = searchParams.get('periodEnd');

    if (!periodEndParam) {
      return Response.json({ error: 'Missing periodEnd parameter' }, { status: 400 });
    }

    const periodEnd = new Date(periodEndParam);
    const report = await ReportEngine.generateBalanceSheet(auth.tenantId, periodEnd);

    return Response.json(report);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to generate balance sheet' }, { status: 500 });
  }
}
