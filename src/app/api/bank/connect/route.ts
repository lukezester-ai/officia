import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { assertFeature, getTenantBilling } from '@/lib/billing/enforcement';
import { db } from '@/lib/db/db';
import { tenants as tenantsSchema } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';
import {
  BG_INSTITUTIONS,
  createBankRequisition,
  isNordigenConfigured,
  type NordigenCredentials,
} from '@/lib/banking/nordigen';

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireTenant();
    const billing = await getTenantBilling(tenantId);
    if (billing) {
      const gate = assertFeature(billing, 'bankSync');
      if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    }

    const [tenant] = await db
      .select({ nordigenSecretId: tenantsSchema.nordigenSecretId, nordigenSecretKey: tenantsSchema.nordigenSecretKey })
      .from(tenantsSchema)
      .where(eq(tenantsSchema.id, tenantId));

    const credentials: NordigenCredentials | undefined =
      tenant?.nordigenSecretId && tenant?.nordigenSecretKey
        ? { secretId: tenant.nordigenSecretId, secretKey: tenant.nordigenSecretKey }
        : undefined;

    if (!isNordigenConfigured(credentials)) {
      return NextResponse.json(
        { error: 'Open Banking не е конфигуриран. Добавете своите GoCardless ключове в Настройки > Работно пространство.' },
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

    const requisition = await createBankRequisition(
      { institutionId, redirectUrl, reference: `${tenantId}:${Date.now()}` },
      credentials,
    );

    return NextResponse.json({
      link: requisition.link,
      requisitionId: requisition.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connect failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
