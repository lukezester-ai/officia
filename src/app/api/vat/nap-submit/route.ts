import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { isNapConfigured } from '@/lib/e-invoice/send-to-nap';

export async function POST() {
  try {
    await requireTenant();

    if (process.env.NAP_MOCK_MODE === 'true') {
      return NextResponse.json({
        success: true,
        mode: 'mock',
        referenceNumber: `MOCK_NAP_${Date.now()}`,
      });
    }

    if (!isNapConfigured('test')) {
      return NextResponse.json(
        {
          success: false,
          mode: 'disabled',
          error:
            'NAP e-services are not configured. Set NAP_ENABLED=true and certificate paths, or NAP_MOCK_MODE=true for staging.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        mode: 'live',
        error: 'Live NAP VAT submission requires KEP integration (not yet implemented).',
      },
      { status: 501 },
    );
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 500 });
  }
}
