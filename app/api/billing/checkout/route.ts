import { redirect } from "next/navigation";
import { getBillingPlan } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const formData = await req.formData();
  const planId = String(formData.get("plan") || "");
  const plan = getBillingPlan(planId);

  if (!plan) {
    redirect("/pricing?checkout=invalid-plan");
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const configuredPriceId = process.env[plan.stripePriceEnv];

  if (!stripeSecretKey || !configuredPriceId) {
    redirect(`/pricing?checkout=placeholder&plan=${plan.id}`);
  }

  redirect(`/pricing?checkout=stripe-not-wired&plan=${plan.id}`);
}
