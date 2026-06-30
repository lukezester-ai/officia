import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { createProSubscriptionCheckout } from '@/lib/billing/stripe-subscription';

export async function POST(req: Request) {
  try {
    const { tenantId, user, tenant } = await requireTenant();
    const body = await req.json().catch(() => ({}));
    const billingCycle = body.billingCycle === 'monthly' ? 'monthly' : 'annual';
    const origin = new URL(req.url).origin;
    const lang = body.lang || 'bg';

    const session = await createProSubscriptionCheckout({
      tenantId,
      userEmail: user.email,
      billingCycle,
      successUrl: `${origin}/${lang}/dashboard/settings?billing=success`,
      cancelUrl: `${origin}/${lang}/dashboard/settings?billing=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Billing error' }, { status: 500 });
  }
}
