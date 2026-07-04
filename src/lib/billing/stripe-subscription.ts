import Stripe from 'stripe';
import { TRIAL_DAYS } from '@/lib/billing/plans';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' as any })
  : null;

export async function createProSubscriptionCheckout(params: {
  tenantId: string;
  userEmail: string;
  customerId?: string | null;
  includeTrial: boolean;
  billingCycle: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) throw new Error('Stripe не е настроен.');

  const priceId =
    params.billingCycle === 'annual'
      ? process.env.STRIPE_PRICE_PRO_ANNUAL
      : process.env.STRIPE_PRICE_PRO_MONTHLY;

  if (!priceId) {
    throw new Error('Цената на професионалния план в Stripe не е настроена.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ...(params.customerId
      ? { customer: params.customerId }
      : { customer_email: params.userEmail }),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      ...(params.includeTrial ? { trial_period_days: TRIAL_DAYS } : {}),
      metadata: { tenantId: params.tenantId },
    },
    metadata: { tenantId: params.tenantId, plan: 'pro' },
  });

  return session;
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) throw new Error('Stripe не е настроен.');
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

export { stripe };
