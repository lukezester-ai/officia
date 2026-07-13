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
        status: 'paid',
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id
      }).where(eq(invoices.id, invoiceId));
      
      console.log(`✅ Invoice ${invoiceId} marked as paid successfully via Stripe webhook.`);
    } else {
      // Auto-issue an invoice for plan checkout / subscription when someone declares payment
      const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : (session.metadata?.billing === 'annual' ? '290.00' : '29.00');
      const newInvoiceNumber = `SUB-${Date.now().toString().slice(-6)}`;
      
      await db.insert(invoices).values({
        tenantId: session.metadata?.tenantId || null,
        userId: session.metadata?.userId || null,
        invoiceNumber: newInvoiceNumber,
        type: 'sale',
        clientName: session.customer_details?.name || session.customer_details?.email || 'Абонат Officia ERP',
        clientAddress: session.customer_details?.address?.line1 || 'България',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        status: 'paid',
        notes: `Автоматично издадена фактура при онлайн плащане на абонаментен план: ${session.metadata?.plan || 'PRO'} (${session.metadata?.billing || 'monthly'})`,
        subtotal: amount,
        totalAmount: amount,
        amount: amount,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        items: [
          {
            description: `Абонаментен план Officia (${session.metadata?.plan || 'PRO'} - ${session.metadata?.billing || 'monthly'})`,
            quantity: 1,
            unitPrice: amount,
            total: amount
          }
        ]
      } as any);

      console.log(`✅ Automatically issued invoice ${newInvoiceNumber} for subscription checkout ${session.id}.`);
    }
  } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
    const stripeInvoice = event.data.object as Stripe.Invoice;
    const invoiceIdStr = stripeInvoice.metadata?.invoiceId;

    if (invoiceIdStr) {
      const invoiceId = parseInt(invoiceIdStr, 10);
      await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, invoiceId));
      console.log(`✅ Invoice ${invoiceId} marked as paid via invoice.paid webhook.`);
    } else if (stripeInvoice.billing_reason === 'subscription_cycle') {
      const amount = (stripeInvoice.amount_paid / 100).toFixed(2);
      const newInvoiceNumber = `SUB-${Date.now().toString().slice(-6)}`;
      
      await db.insert(invoices).values({
        invoiceNumber: newInvoiceNumber,
        type: 'sale',
        clientName: stripeInvoice.customer_name || stripeInvoice.customer_email || 'Абонат Officia ERP',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        status: 'paid',
        notes: `Автоматична фактура за подновяване на абонамент: ${stripeInvoice.number || newInvoiceNumber}`,
        subtotal: amount,
        totalAmount: amount,
        amount: amount,
        items: [
          {
            description: `Периодичен абонамент Officia ERP (${new Date().toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })})`,
            quantity: 1,
            unitPrice: amount,
            total: amount
          }
        ]
      } as any);

      console.log(`✅ Automatically issued renewal invoice ${newInvoiceNumber} via recurring invoice webhook.`);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
