import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema/users';
import { tenants } from '@/lib/db/schema/tenants';
import { eq } from 'drizzle-orm';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' as any })
  : null;

export async function GET(req: Request) {
  if (!stripe) {
    return new NextResponse('Stripe not configured', { status: 500 });
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const [user] = await db
    .select({ email: users.email, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (!user?.email) {
    return new NextResponse('User not found', { status: 404 });
  }

  const url = new URL(req.url);
  const planParam = url.searchParams.get('plan');
  const plan = planParam === 'business' || planParam === 'accounting-firm' ? planParam : 'pro';
  const cycle = url.searchParams.get('cycle') === 'annual' ? 'annual' : 'monthly';
  const origin = url.origin;

  let priceId: string | undefined;
  if (plan === 'business') {
    priceId = cycle === 'annual' ? process.env.STRIPE_PRICE_BUSINESS_ANNUAL : process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  } else if (plan === 'accounting-firm') {
    priceId = cycle === 'annual' ? process.env.STRIPE_PRICE_ACCOUNTING_FIRM_ANNUAL : process.env.STRIPE_PRICE_ACCOUNTING_FIRM_MONTHLY;
  } else {
    priceId = cycle === 'annual' ? process.env.STRIPE_PRICE_PRO_ANNUAL : process.env.STRIPE_PRICE_PRO_MONTHLY;
  }

  if (!priceId) {
    return new NextResponse('Price not configured', { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: clerkId,
      success_url: `${origin}/dashboard/settings/workspace?billing=success`,
      cancel_url: `${origin}/dashboard?billing=canceled`,
      metadata: { plan, tenantId: user.tenantId ?? '' },
    });

    return NextResponse.redirect(session.url!);
  } catch (error: any) {
    console.error('[STRIPE GO ERROR]', error);
    return new NextResponse(error.message || 'Stripe error', { status: 500 });
  }
}
