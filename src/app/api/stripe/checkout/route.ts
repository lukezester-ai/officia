import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireApiSession } from '@/lib/auth/api-guard';
import { getAppBaseUrl } from '@/lib/config/app-url';
import { getServerPriceId, parseCheckoutBilling, parseCheckoutPlan } from '@/lib/billing/plans';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,
  });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function POST(req: NextRequest) {
  const { ctx, response } = await requireApiSession();
  if (response || !ctx) return response!;

  let body: { plan?: unknown; billing?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = parseCheckoutPlan(body.plan);
  const billing = parseCheckoutBilling(body.billing);
  if (!plan || !billing) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  }

  const priceId = getServerPriceId(plan, billing);
  if (!priceId) {
    return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 });
  }

  let origin: string;
  try {
    origin = getAppBaseUrl();
  } catch {
    return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/bg/dashboard?upgraded=true`,
      cancel_url: `${origin}/bg#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'bg',
      client_reference_id: ctx.tenantId,
      metadata: {
        plan,
        billing,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout is unavailable' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE_SUBSCRIPTION_ERROR]', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 502 });
  }
}
