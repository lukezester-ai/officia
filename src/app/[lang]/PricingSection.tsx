"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Zap, Building2, Sparkles, Scale } from 'lucide-react';

function getPlanHref(planId: string, isAnnual: boolean): string {
  if (planId === 'starter') return '/sign-up';
  const billing = isAnnual ? 'annual' : 'monthly';
  return `/api/stripe/checkout?plan=${planId}&billing=${billing}`;
}

function formatPrice(n: number): string {
  return n % 1 !== 0 ? n.toFixed(2) : n.toString();
}

type PlanCopy = {
  name: string;
  description: string;
  badge?: string;
  cta: string;
  features: string[];
  locked?: string[];
};

type PricingCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  monthly: string;
  annual: string;
  perMonth: string;
  billedMonthly: string;
  free: string;
  freeNote: string;
  annualNote: string;
  footer: string;
  currency: string;
  plans: {
    starter: PlanCopy;
    business: PlanCopy;
    pro: PlanCopy;
    accounting_firm: PlanCopy;
  };
};

const PLAN_META = [
  { id: 'starter' as const, icon: Zap, monthlyPrice: 0, annualPrice: 0, annualTotal: 0, isFree: true },
  { id: 'business' as const, icon: Building2, monthlyPrice: 55, annualPrice: 44, annualTotal: 528, isFree: false, featured: true },
  { id: 'pro' as const, icon: Sparkles, monthlyPrice: 179, annualPrice: 143, annualTotal: 1716, isFree: false },
  { id: 'accounting_firm' as const, icon: Scale, monthlyPrice: 329, annualPrice: 263, annualTotal: 3156, isFree: false },
];

export default function PricingSection({ copy }: { copy: PricingCopy }) {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="relative overflow-hidden px-6 py-24 text-[#F8FAFC]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 55%), #0B1220',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#F59E0B]">
            {copy.eyebrow}
          </p>
          <h2 className="mb-4 font-mono text-3xl font-bold tracking-tight md:text-4xl">
            {copy.title}
          </h2>
          <p className="mb-8 text-[#94A3B8]">{copy.subtitle}</p>

          <div className="inline-flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className={`text-sm ${!isAnnual ? 'font-semibold text-white' : 'text-[#94A3B8]'}`}>
              {copy.monthly}
            </span>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              aria-label="Toggle billing period"
              className="relative h-7 w-14 cursor-pointer rounded-full border border-white/15 bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            >
              <span
                className={`absolute top-1 start-1 h-5 w-5 rounded-full bg-[#F59E0B] transition-transform ${
                  isAnnual ? 'translate-x-7 rtl:-translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`flex items-center gap-1.5 text-sm ${isAnnual ? 'font-semibold text-white' : 'text-[#94A3B8]'}`}>
              {copy.annual}
              <span className="bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                -20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_META.map((meta) => {
            const plan = copy.plans[meta.id];
            const Icon = meta.icon;
            const price = isAnnual ? meta.annualPrice : meta.monthlyPrice;
            const featured = 'featured' in meta && meta.featured;

            return (
              <div
                key={meta.id}
                className={
                  featured
                    ? 'relative flex flex-col border border-[#F59E0B]/45 bg-gradient-to-b from-[#F59E0B]/15 to-[#0B1220] p-6'
                    : 'relative flex flex-col border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-white/20'
                }
              >
                {plan.badge && (
                  <div className="absolute top-4 end-4 bg-[#F59E0B] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B1220]">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={16} className={featured ? 'text-[#FBBF24]' : 'text-[#F59E0B]'} />
                    <div className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
                      {plan.name}
                    </div>
                  </div>
                  <div className="mb-4 text-xs text-[#94A3B8]">{plan.description}</div>

                  {meta.isFree ? (
                    <>
                      <div className="font-mono text-3xl font-bold text-white">{copy.free}</div>
                      <div className="mt-1 text-xs text-[#64748B]">{copy.freeNote}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <div className="font-mono text-3xl font-bold text-white">
                          {formatPrice(price)} {copy.currency}
                        </div>
                        <div className="mb-1 text-sm text-[#94A3B8]">{copy.perMonth}</div>
                      </div>
                      <div className="mt-1 text-xs text-[#64748B]">
                        {isAnnual
                          ? copy.annualNote
                              .replace('{total}', formatPrice(meta.annualTotal))
                              .replace(
                                '{save}',
                                formatPrice(
                                  Math.round((meta.monthlyPrice - meta.annualPrice) * 12 * 100) / 100,
                                ),
                              )
                          : copy.billedMonthly}
                      </div>
                    </>
                  )}
                </div>

                <div className="mb-6 flex-1 space-y-2 text-xs text-[#CBD5E1]">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5">
                      <CheckCircle
                        size={12}
                        className={`mt-0.5 shrink-0 ${featured ? 'text-[#FBBF24]' : 'text-emerald-400'}`}
                      />
                      {f}
                    </div>
                  ))}
                  {plan.locked?.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 opacity-35">
                      <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-zinc-600" />
                      {f}
                    </div>
                  ))}
                </div>

                <Link
                  href={getPlanHref(meta.id, isAnnual)}
                  className={
                    featured
                      ? 'mt-auto block cursor-pointer bg-[#F59E0B] py-3 text-center text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#FBBF24]'
                      : meta.isFree
                        ? 'mt-auto block cursor-pointer border border-white/15 py-3 text-center text-sm font-medium transition-colors hover:border-white/30 hover:bg-white/5'
                        : 'mt-auto block cursor-pointer border border-[#F59E0B]/40 py-3 text-center text-sm font-semibold text-[#F59E0B] transition-colors hover:border-[#FBBF24] hover:bg-[#F59E0B]/10'
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[#64748B]">{copy.footer}</p>
      </div>
    </section>
  );
}
