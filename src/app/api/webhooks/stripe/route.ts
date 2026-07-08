import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db/db';
import { invoices, tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-05-27.dahlia' as any })
  : null;

export async function POST(req: Request) {
  if (!stripe || !stripeSecretKey) {
    return new NextResponse('Stripe is not configured', { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !stripeWebhookSecret) {
      return new NextResponse('Webhook signature verification required', { status: 400 });
    } else {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed.', message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceIdStr = session.metadata?.invoiceId;
    const tenantId = session.metadata?.tenantId;

    if (invoiceIdStr) {
      const invoiceId = parseInt(invoiceIdStr, 10);
      await db
        .update(invoices)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));
    }

    if (tenantId && session.mode === 'subscription') {
      const plan = session.metadata?.plan === 'business' ? 'business' : 'pro';
      await db
        .update(tenants)
        .set({
          plan,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
          stripeSubscriptionId:
            typeof session.subscription === 'string' ? session.subscription : null,
        })
        .where(eq(tenants.id, tenantId));
    }
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.updated'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId = subscription.metadata?.tenantId;
    if (tenantId) {
      const active = subscription.status === 'active' || subscription.status === 'trialing';
      const plan = active
        ? (subscription.metadata?.plan === 'business' ? 'business' : 'pro')
        : 'starter';
      await db
        .update(tenants)
        .set({
          plan,
          stripeSubscriptionId: active ? subscription.id : null,
        })
        .where(eq(tenants.id, tenantId));
    }
  }

  return NextResponse.json({ received: true });
}
