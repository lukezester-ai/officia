// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

// Price IDs от Stripe Dashboard – настрои в Render Environment Variables
const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
  },
  accounting_firm: {
    monthly: process.env.STRIPE_PRICE_FIRM_MONTHLY || process.env.STRIPE_PRICE_ACCOUNTING_FIRM_MONTHLY || '',
    annual: process.env.STRIPE_PRICE_FIRM_ANNUAL || process.env.STRIPE_PRICE_ACCOUNTING_FIRM_ANNUAL || '',
  },
};

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth().catch(() => ({ userId: null, orgId: null }));
    const { searchParams } = new URL(req.url);
    const plan = searchParams.get('plan') || 'business';
    const billing = searchParams.get('billing') || 'annual';
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const priceId = PRICE_IDS[plan]?.[billing as 'monthly' | 'annual'];

    let lineItems: any[] = [];
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      // Fallback: ако няма настроен priceId в променливите, създаваме динамична цена в Stripe (за да работи бутонът за плащане винаги)
      const defaultPlans: Record<string, { monthly: number; annual: number; name: string }> = {
        business: { monthly: 5500, annual: 4400, name: 'Officia MENA Business' },
        pro: { monthly: 17900, annual: 14300, name: 'Officia MENA Pro' },
        accounting_firm: { monthly: 32900, annual: 26300, name: 'Officia MENA Practice' },
      };
      const planInfo = defaultPlans[plan] || defaultPlans.business;
      // Amounts are already in fils (1 AED = 100 fils)
      const unitAmountCents = billing === 'annual' ? planInfo.annual : planInfo.monthly;

      lineItems = [
        {
          price_data: {
            currency: 'aed',
            product_data: {
              name: planInfo.name,
              description: `Subscription (${billing === 'annual' ? 'annual billing' : 'monthly billing'})`,
            },
            unit_amount: unitAmountCents,
            recurring: {
              interval: billing === 'annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${origin}/ar/dashboard?upgraded=true`,
      cancel_url: `${origin}/ar#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'ar',
      metadata: {
        plan,
        billing,
        userId: userId || '',
        tenantId: orgId || '',
      },
    });

    return NextResponse.redirect(session.url!);
  } catch (err: any) {
    console.error('[STRIPE_SUBSCRIPTION_ERROR]', err);
    // Fallback към sign-up ако Stripe гърми
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-up`);
  }
}
