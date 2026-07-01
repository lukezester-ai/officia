import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { createProSubscriptionCheckout } from '@/lib/billing/stripe-subscription';

export async function POST(req: Request) {
  try {
    const { tenantId, user, tenant } = await requireTenant();
    const body = await req.json().catch(() => ({}));
    const billingCycle = body.billingCycle === 'monthly' ? 'monthly' : 'annual';
    const origin = new URL(req.url).origin;
    const lang = 'bg';

    const session = await createProSubscriptionCheckout({
      tenantId,
      userEmail: user.email,
      customerId: tenant?.stripeCustomerId,
      includeTrial: !tenant?.stripeCustomerId,
      billingCycle,
      successUrl: `${origin}/${lang}/dashboard/settings/workspace?billing=success`,
      cancelUrl: `${origin}/${lang}/dashboard/settings/workspace?billing=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Грешка при плащането' }, { status: 500 });
  }
}
