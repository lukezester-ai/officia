import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { createBillingPortalSession } from '@/lib/billing/stripe-subscription';

export async function POST(req: Request) {
  try {
    const { tenant } = await requireTenant();
    if (!tenant?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Все още няма активиран Stripe профил за този абонамент.' },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;
    const session = await createBillingPortalSession(
      tenant.stripeCustomerId,
      `${origin}/bg/dashboard/settings/workspace`,
    );

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Грешка при отваряне на абонамента';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
