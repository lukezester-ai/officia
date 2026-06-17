export type BillingPlanId = "starter" | "pro" | "firm";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  stripePriceEnv: string;
  features: string[];
  highlighted?: boolean;
};

export const billingPlans: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "€29",
    period: "per month",
    description: "For solo accountants and small offices starting with AI-assisted admin.",
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    features: ["1 workspace", "Up to 3 users", "Invoice dashboard", "Document archive", "Waitlist support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€79",
    period: "per month",
    description: "For growing accounting teams that need automation and AI document intelligence.",
    stripePriceEnv: "STRIPE_PRICE_PRO",
    highlighted: true,
    features: ["5 workspaces", "Up to 15 users", "AI assistant", "Document extraction", "HR reminders", "Priority support"],
  },
  {
    id: "firm",
    name: "Firm",
    price: "Custom",
    period: "annual contract",
    description: "For accounting firms and back offices with advanced security and onboarding needs.",
    stripePriceEnv: "STRIPE_PRICE_FIRM",
    features: ["Unlimited workspaces", "Custom user seats", "Audit trail", "Dedicated onboarding", "SLA support"],
  },
];

export function getBillingPlan(planId: string | null | undefined) {
  return billingPlans.find((plan) => plan.id === planId);
}
