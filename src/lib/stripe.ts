import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',
  appInfo: {
    name: 'Officia ERP',
    version: '1.0.0'
  }
});

export const getStripeSessionUrl = async (invoiceId: number, amount: number, currency: string = 'eur', customerEmail?: string, invoiceNumber?: string) => {
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
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/public/invoice/${invoiceId}?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/public/invoice/${invoiceId}?canceled=true`,
    metadata: {
      invoiceId: invoiceId.toString(),
    },
  });

  return { url: session.url, id: session.id };
};
