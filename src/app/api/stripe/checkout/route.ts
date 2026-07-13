import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
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
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plan = searchParams.get('plan') || 'business';
    const billing = searchParams.get('billing') || 'annual';
    const origin = req.headers.get('origin') || 'https://officiabg.com';

    const priceId = PRICE_IDS[plan]?.[billing as 'monthly' | 'annual'];

    // Ако нямаме price ID, пренасочваме към sign-up (fallback)
    if (!priceId) {
      return NextResponse.redirect(`${origin}/sign-up`);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/bg/dashboard?upgraded=true`,
      cancel_url: `${origin}/bg#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'bg',
      metadata: {
        plan,
        billing,
      },
    });

    return NextResponse.redirect(session.url!);
  } catch (err: any) {
    console.error('[STRIPE_SUBSCRIPTION_ERROR]', err);
    // Fallback към sign-up ако Stripe гърми
    return NextResponse.redirect('https://officiabg.com/sign-up');
  }
}
