import Stripe from 'stripe';
import { getAppBaseUrl } from '@/lib/config/app-url';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2026-05-27.dahlia' as any,
    appInfo: {
      name: 'Officia ERP',
      version: '1.0.0'
    }
  });
}

export const getStripeSessionUrl = async (invoiceId: string, amount: number, currency: string = 'eur', customerEmail?: string, invoiceNumber?: string) => {
  const origin = getAppBaseUrl();
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Invoice #${invoiceNumber || invoiceId}`,
            description: 'Payment for services/products',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `Фактура № ${invoiceNumber || invoiceId} от Officia ERP`,
      }
    },
    success_url: `${origin}/bg/public/invoice/${invoiceId}?success=true`,
    cancel_url: `${origin}/bg/public/invoice/${invoiceId}?canceled=true`,
    metadata: {
      invoiceId,
    },
  });

  return { url: session.url, id: session.id };
};
