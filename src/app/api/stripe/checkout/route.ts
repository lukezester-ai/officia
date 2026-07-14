// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia' as any,
});

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
    const origin = req.headers.get('origin') || 'https://officiabg.com';

    const priceId = PRICE_IDS[plan]?.[billing as 'monthly' | 'annual'];

    let lineItems: any[] = [];
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      // Fallback: ако няма настроен priceId в променливите, създаваме динамична цена в Stripe (за да работи бутонът за плащане винаги)
      const defaultPlans: Record<string, { monthly: number; annual: number; name: string }> = {
        business: { monthly: 1490, annual: 1190, name: 'Officia Business' },
        pro: { monthly: 4900, annual: 3900, name: 'Officia Pro' },
        accounting_firm: { monthly: 8900, annual: 7100, name: 'Officia Кантора (Accounting Firm)' },
      };
      const planInfo = defaultPlans[plan] || defaultPlans.business;
      const unitAmountCents = billing === 'annual' ? planInfo.annual * 100 : planInfo.monthly * 100;

      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planInfo.name,
              description: `Абонаментен план (${billing === 'annual' ? 'Годишно таксуване' : 'Месечно таксуване'})`,
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
      success_url: `${origin}/bg/dashboard?upgraded=true`,
      cancel_url: `${origin}/bg#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'bg',
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
    return NextResponse.redirect('https://officiabg.com/sign-up');
  }
}
