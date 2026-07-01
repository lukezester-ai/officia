import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2026-04-22.dahlia',
      appInfo: {
        name: 'Officia ERP',
        version: '1.0.0',
      },
    });
  }
  return stripeClient;
}

export const getStripeSessionUrl = async (
  invoiceId: number,
  amount: number,
  currency: string = 'eur',
  customerEmail?: string,
  invoiceNumber?: string,
  lang: string = 'bg',
) => {
  const stripe = getStripeClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invoicePath = `/${lang}/public/invoice/${invoiceId}`;

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
    success_url: `${baseUrl}${invoicePath}?success=true`,
    cancel_url: `${baseUrl}${invoicePath}?canceled=true`,
    metadata: {
      invoiceId: invoiceId.toString(),
    },
  });

  return { url: session.url, id: session.id };
};
