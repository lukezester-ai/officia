import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' as any })
  : null;

export async function GET(req: Request) {
  if (!stripe) {
    return new NextResponse('Stripe not configured', { status: 500 });
  }

  const url = new URL(req.url);
  const plan = url.searchParams.get('plan') === 'business' ? 'business' : 'pro';
  const cycle = url.searchParams.get('cycle') === 'annual' ? 'annual' : 'monthly';
  const origin = url.origin;

  const priceId = plan === 'business'
    ? (cycle === 'annual' ? process.env.STRIPE_PRICE_BUSINESS_ANNUAL : process.env.STRIPE_PRICE_BUSINESS_MONTHLY)
    : (cycle === 'annual' ? process.env.STRIPE_PRICE_PRO_ANNUAL : process.env.STRIPE_PRICE_PRO_MONTHLY);

  if (!priceId) {
    return new NextResponse('Price not configured', { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/settings/workspace?billing=success`,
      cancel_url: `${origin}/dashboard?billing=canceled`,
      metadata: { plan },
    });

    return NextResponse.redirect(session.url!);
  } catch (error: any) {
    console.error('[STRIPE GO ERROR]', error);
    return new NextResponse(error.message || 'Stripe error', { status: 500 });
  }
}
