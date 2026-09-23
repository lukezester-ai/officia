export const CHECKOUT_PLANS = ['business', 'pro', 'accounting_firm'] as const;
export const CHECKOUT_BILLING = ['monthly', 'annual'] as const;

export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];
export type CheckoutBilling = (typeof CHECKOUT_BILLING)[number];

const PRICE_ENV: Record<CheckoutPlan, Record<CheckoutBilling, string[]>> = {
  business: {
    monthly: ['STRIPE_PRICE_BUSINESS_MONTHLY'],
    annual: ['STRIPE_PRICE_BUSINESS_ANNUAL'],
  },
  pro: {
    monthly: ['STRIPE_PRICE_PRO_MONTHLY'],
    annual: ['STRIPE_PRICE_PRO_ANNUAL'],
  },
  accounting_firm: {
    monthly: ['STRIPE_PRICE_FIRM_MONTHLY', 'STRIPE_PRICE_ACCOUNTING_FIRM_MONTHLY'],
    annual: ['STRIPE_PRICE_FIRM_ANNUAL', 'STRIPE_PRICE_ACCOUNTING_FIRM_ANNUAL'],
  },
};

export function parseCheckoutPlan(value: unknown): CheckoutPlan | null {
  return CHECKOUT_PLANS.includes(value as CheckoutPlan) ? (value as CheckoutPlan) : null;
}

export function parseCheckoutBilling(value: unknown): CheckoutBilling | null {
  return CHECKOUT_BILLING.includes(value as CheckoutBilling) ? (value as CheckoutBilling) : null;
}

export function getServerPriceId(plan: CheckoutPlan, billing: CheckoutBilling): string | null {
  for (const key of PRICE_ENV[plan][billing]) {
    const id = process.env[key]?.trim();
    if (id) return id;
  }
  return null;
}
