"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, Check, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";

interface PricingPlan {
  id: string;
  name: string;
  labelColor: string;
  priceMonthly: string | number;
  priceAnnual: string | number;
  subtitle: string;
  annualNote?: string;
  features: string[];
  ctaText: string;
  ctaVariant: "outline" | "solid";
  isPopular?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: "starter",
    name: "СТАРТЕР",
    labelColor: "text-slate-400",
    priceMonthly: "Безплатно",
    priceAnnual: "Безплатно",
    subtitle: "14 дни · без кредитна карта",
    features: [
      "До 50 фактури/месец",
      "Базово счетоводство",
      "Open Banking (PSD2)",
      "1 потребител",
    ],
    ctaText: "Започни безплатно",
    ctaVariant: "outline",
  },
  {
    id: "business",
    name: "БИЗНЕС",
    labelColor: "text-[#f59e0b]",
    priceMonthly: 14.9,
    priceAnnual: 11.9,
    subtitle: "За малки екипи",
    annualNote: "Таксува се 142.80 € веднъж годишно",
    features: [
      "До 500 фактури/месец",
      "Анализ на документи с изкуствен интелект",
      "Open Banking (PSD2)",
      "Декларации Обр. 1 и Обр. 6",
      "До 3 потребители",
    ],
    ctaText: "Избери Бизнес",
    ctaVariant: "outline",
  },
  {
    id: "pro",
    name: "ПРО",
    labelColor: "text-[#a78bfa]",
    priceMonthly: 39.2,
    priceAnnual: 31.36,
    subtitle: "За разрастващи се бизнеси",
    annualNote: "Таксува се 376.32 € веднъж годишно",
    features: [
      "Неограничени фактури",
      "Анализ на документи с изкуствен интелект",
      "Open Banking (PSD2)",
      "Декларации Обр. 1 и Обр. 6",
      "VIES декларации (ЕС)",
      "До 10 потребители — в разработка",
    ],
    ctaText: "Започни пробния период",
    ctaVariant: "solid",
    isPopular: true,
  },
  {
    id: "accounting-firm",
    name: "СЧЕТОВОДНА КАНТОРА",
    labelColor: "text-emerald-400",
    priceMonthly: 99,
    priceAnnual: 79.2,
    subtitle: "За професионални счетоводни кантори",
    annualNote: "Таксува се 950.40 € веднъж годишно",
    features: [
      "Неограничени фактури",
      "Анализ на документи с изкуствен интелект",
      "Open Banking (PSD2)",
      "Декларации Обр. 1 и Обр. 6",
      "VIES декларации (ЕС)",
      "Неограничени потребители",
      "API достъп",
    ],
    ctaText: "Избери Кантора",
    ctaVariant: "outline",
  },
];

const footerLinks = ['14 дни пробен период', 'Защитено удостоверяване', 'Поддръжка на български'];

export default function PricingSection({ lang }: { lang: string }) {
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("annual");
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[#0d0d14] px-6 py-24 text-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-amber-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center">
        <div className="mb-16 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="mb-5 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            Прост, честен ценови план
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.08, ease: [0.4, 0, 0.2, 1] }}
            className="mx-auto max-w-2xl text-lg text-slate-400 md:text-xl"
          >
            Без скрити такси. Без изненади.
          </motion.p>
        </div>

        <div className="mb-20 flex items-center gap-1 rounded-full border border-white/10 bg-[#111120] p-1.5">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "relative cursor-pointer select-none rounded-full px-6 py-2.5 text-sm font-medium transition-colors",
              billingCycle === "monthly" ? "text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            {billingCycle === "monthly" && (
              <motion.div
                layoutId="billing-pill"
                className="absolute inset-0 rounded-full bg-[#7c3aed]"
                transition={reducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="relative z-10">Месечно</span>
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "relative flex cursor-pointer select-none items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-colors",
              billingCycle === "annual" ? "text-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            {billingCycle === "annual" && (
              <motion.div
                layoutId="billing-pill"
                className="absolute inset-0 rounded-full bg-[#7c3aed]"
                transition={reducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="relative z-10">Годишно</span>
          </button>

          <div className="ml-2 mr-1 hidden items-center sm:flex">
            <span className="rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a78bfa]">
              -20%
            </span>
          </div>
        </div>

        <div className="grid w-full max-w-7xl grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : index * 0.08, ease: [0.4, 0, 0.2, 1] }}
              className="flex"
            >
              <div
                className={cn(
                  "flex w-full flex-col rounded-2xl p-8 transition-all",
                  plan.isPopular
                    ? "border border-transparent bg-[#130d2a] shadow-[0_0_40px_rgba(124,58,237,0.25),inset_0_0_0_1px_rgba(124,58,237,0.45)]"
                    : "border border-white/10 bg-[#111120]",
                )}
              >
                {plan.isPopular && (
                  <div className="-mt-1 mb-4 flex justify-end">
                    <span className="rounded-full bg-[#7c3aed] px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                      Популярен
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <span className={cn("mb-5 block text-[10px] font-bold uppercase tracking-[0.18em]", plan.labelColor)}>
                    {plan.name}
                  </span>

                  <div className="mb-1.5 flex items-baseline gap-2">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${plan.id}-${billingCycle}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={transition}
                        className={cn("font-bold tracking-tight", plan.isPopular ? "text-[#a78bfa]" : "text-white")}
                        style={{
                          fontSize: typeof plan.priceMonthly === "number" ? "clamp(2rem,4vw,2.75rem)" : "2rem",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {typeof plan.priceMonthly === "number"
                          ? `${(billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly).toLocaleString("bg-BG", {
                              minimumFractionDigits: 2,
                            })} €`
                          : plan.priceMonthly}
                      </motion.span>
                    </AnimatePresence>
                    {typeof plan.priceMonthly === "number" && (
                      <span className="text-sm font-medium text-slate-500">/мес</span>
                    )}
                  </div>

                  {typeof plan.priceMonthly === "number" && billingCycle === "annual" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={transition}
                      className="mb-2 flex items-center gap-2"
                    >
                      <span className="text-sm text-slate-600 line-through">
                        {plan.priceMonthly.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} €
                      </span>
                      <span className="text-xs font-semibold text-[#a78bfa]">-20%</span>
                    </motion.div>
                  )}

                  <p className="text-sm text-slate-400">{plan.subtitle}</p>

                  {plan.annualNote && billingCycle === "annual" && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={transition}
                      className="mt-2 text-xs italic text-slate-500"
                    >
                      {plan.annualNote}
                    </motion.p>
                  )}
                </div>

                <div
                  className={cn(
                    "mb-7 h-px",
                    plan.isPopular ? "bg-violet-500/25" : "bg-white/10",
                  )}
                />

                <ul className="mb-10 flex-grow space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="group flex items-start gap-3">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.isPopular ? "text-[#a78bfa]" : "text-slate-500",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className="text-sm leading-normal text-slate-300 transition-colors group-hover:text-white">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={signUpHref}
                  className={cn(
                    "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
                    plan.ctaVariant === "solid"
                      ? "bg-[#7c3aed] text-white shadow-[0_4px_24px_rgba(124,58,237,0.3)] hover:bg-[#6d28d9]"
                      : "border border-white/15 bg-transparent text-slate-200 hover:border-white/25 hover:bg-white/5",
                  )}
                >
                  <span>{plan.ctaText}</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 flex w-full flex-col items-center border-t border-white/5 pt-8">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-slate-600" />
              <span>Всички планове включват:</span>
            </div>
            {footerLinks.map((link) => (
              <span key={link} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-700/60" />
                {link}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 opacity-60">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400">
              <Building2 className="h-4 w-4" />
              <span>ЧЕСТНИ ЦЕНИ · БЕЗ СКРИТИ ТАКСИ</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400">
              <Shield className="h-4 w-4" />
              <span>CLERK + POSTGRESQL</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
