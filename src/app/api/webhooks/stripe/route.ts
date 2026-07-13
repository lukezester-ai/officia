// @ts-nocheck
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-05-27.dahlia' as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !stripeWebhookSecret) {
      // If we don't have webhook secret in dev, just parse the body (not recommended for production)
      event = JSON.parse(body);
    } else {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceIdStr = session.metadata?.invoiceId;

    if (invoiceIdStr) {
      const invoiceId = parseInt(invoiceIdStr, 10);
      
      // Update invoice to paid
      await db.update(invoices).set({
        status: 'paid'
      }).where(eq(invoices.id, invoiceId));
      
      console.log(`✅ Invoice ${invoiceId} marked as paid successfully via Stripe webhook.`);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
