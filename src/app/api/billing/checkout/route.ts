import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { createSubscriptionCheckout } from '@/lib/billing/stripe-subscription';

type CheckoutPlan = 'business' | 'pro' | 'accounting-firm';

export async function POST(req: Request) {
  try {
    const { tenantId, user, tenant } = await requireTenant();
    const body = await req.json().catch(() => ({}));
    const billingCycle = body.billingCycle === 'monthly' ? 'monthly' : 'annual';
    const rawPlan = body.plan as string;
    const plan: CheckoutPlan = rawPlan === 'business' || rawPlan === 'accounting-firm' ? rawPlan : 'pro';
    const origin = new URL(req.url).origin;
    const lang = 'bg';

    const session = await createSubscriptionCheckout({
      tenantId,
      userEmail: user.email,
      customerId: tenant?.stripeCustomerId,
      includeTrial: false,
      billingCycle,
      plan,
      successUrl: `${origin}/${lang}/dashboard/settings/workspace?billing=success`,
      cancelUrl: `${origin}/${lang}/dashboard/settings/workspace?billing=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[CHECKOUT ERROR]', error);
    return NextResponse.json({ error: error.message || 'Грешка при плащането' }, { status: 500 });
  }
}
