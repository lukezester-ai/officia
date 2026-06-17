import { Link } from "@/i18n/routing";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { billingPlans } from "@/lib/billing/plans";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function PricingPage() {
  const t = await getTranslations("Pricing");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="font-display text-3xl font-semibold text-navy">Officia</Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/dashboard" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:border-indigo-300 md:inline-flex">
            Dashboard
          </Link>
          <Link href="/sign-in" className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-indigoElectric">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-8 lg:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 shadow-sm">
            <CreditCard size={15} /> Billing preview
          </div>
          <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-navy sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {billingPlans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                plan.highlighted
                  ? "border-indigo-300 bg-navy text-white shadow-glow"
                  : "border-white bg-white/85 text-slate-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className={`font-display text-3xl font-semibold ${plan.highlighted ? "text-white" : "text-navy"}`}>{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${plan.highlighted ? "text-indigo-100" : "text-slate-600"}`}>{plan.description}</p>
                </div>
                {plan.highlighted ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-100">Popular</span>
                ) : null}
              </div>

              <div className="mt-7 flex items-end gap-2">
                <span className={`font-display text-5xl font-semibold ${plan.highlighted ? "text-white" : "text-navy"}`}>{plan.price}</span>
                <span className={`pb-2 text-sm font-semibold ${plan.highlighted ? "text-indigo-100" : "text-slate-500"}`}>{t("monthly")}</span>
              </div>

              <form action="/api/billing/checkout" method="POST" className="mt-7">
                <input type="hidden" name="plan" value={plan.id} />
                <button
                  type="submit"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                    plan.highlighted
                      ? "bg-white text-navy hover:bg-indigo-50"
                      : "bg-indigoElectric text-white hover:bg-navy"
                  }`}
                >
                  {t("subscribe")} {plan.name} <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-7 grid gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className={`flex items-center gap-3 text-sm font-semibold ${plan.highlighted ? "text-indigo-50" : "text-slate-700"}`}>
                    <CheckCircle2 className={plan.highlighted ? "text-indigo-200" : "text-indigoElectric"} size={18} /> {feature}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 grid gap-4 rounded-[2rem] border border-white bg-white/85 p-6 shadow-sm md:grid-cols-2">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">Secure billing foundation</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Prepared for Stripe checkout, customer portal and subscription status syncing.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">AI-first value metric</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Future billing can scale by workspaces, seats, documents processed and AI usage.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

