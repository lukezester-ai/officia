import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-05-27.dahlia' })
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
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Webhook signature verification required', { status: 400 });
      }
      console.warn('[STRIPE_WEBHOOK] Skipping signature verification in development');
      event = JSON.parse(body) as Stripe.Event;
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

    if (invoiceIdStr) {
      const invoiceId = parseInt(invoiceIdStr, 10);

      await db.update(invoices).set({
        status: 'paid',
        updatedAt: new Date(),
      }).where(eq(invoices.id, invoiceId));
    }
  }

  return NextResponse.json({ received: true });
}
