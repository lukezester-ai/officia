import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { assertFeature, getTenantBilling } from '@/lib/billing/enforcement';
import {
  BG_INSTITUTIONS,
  createBankRequisition,
  isNordigenConfigured,
} from '@/lib/banking/nordigen';

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireTenant();
    const billing = await getTenantBilling(tenantId);
    if (billing) {
      const gate = assertFeature(billing, 'bankSync');
      if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    }

    if (!isNordigenConfigured()) {
      return NextResponse.json(
        { error: 'Nordigen is not configured. Set NORDIGEN_SECRET_ID and NORDIGEN_SECRET_KEY.' },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const bankKey = String(body.bankKey || 'sandbox');
    const institutionId =
      BG_INSTITUTIONS[bankKey] ||
      (process.env.NORDIGEN_USE_SANDBOX === 'true' ? BG_INSTITUTIONS.sandbox : undefined);

    if (!institutionId) {
      return NextResponse.json({ error: 'Unknown bank institution' }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const lang = body.lang || 'bg';
    const redirectUrl = `${origin}/api/bank/callback?lang=${lang}`;

    const requisition = await createBankRequisition({
      institutionId,
      redirectUrl,
      reference: `${tenantId}:${Date.now()}`,
    });

    return NextResponse.json({
      link: requisition.link,
      requisitionId: requisition.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connect failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
