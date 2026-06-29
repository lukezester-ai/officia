import { NextRequest } from 'next/server';
import { ReportEngine } from '@/lib/accounting/report-engine';
import { getAuthenticatedTenant } from '@/lib/auth/api-tenant';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedTenant();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (!startParam || !endParam) {
      return Response.json({ error: 'Missing start or end parameter' }, { status: 400 });
    }

    const start = new Date(startParam);
    const end = new Date(endParam);
    const report = await ReportEngine.generateCashFlow(auth.tenantId, start, end);

    return Response.json(report);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to generate cash flow report' }, { status: 500 });
  }
}
