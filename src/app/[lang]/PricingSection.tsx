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
  return n % 1 !== 0 ? n.toFixed(2).replace('.', ',') : n.toString();
}

type Plan = {
  id: string;
  name: string;
  icon: typeof Zap;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualTotal: number;
  isFree: boolean;
  badge?: string;
  featured?: boolean;
  cta: string;
  features: string[];
  locked?: string[];
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Стартер',
    icon: Zap,
    description: 'За самонаети и микро-фирми',
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    isFree: true,
    cta: 'Започни безплатно',
    features: [
      'До 30 фактури/месец',
      'Основно счетоводство',
      'ДДС дневници (преглед)',
      '1 потребител',
      '1 банкова сметка',
      'Email поддръжка',
    ],
    locked: ['ТРЗ и HR', 'AI асистент', 'НАП export'],
  },
  {
    id: 'business',
    name: 'Бизнес',
    icon: Building2,
    description: 'За малки и средни предприятия',
    monthlyPrice: 14.90,
    annualPrice: 11.90,
    annualTotal: 142.80,
    isFree: false,
    badge: 'Най-популярен',
    featured: true,
    cta: 'Започни пробния период',
    features: [
      'Неограничени фактури и покупки',
      'Пълно счетоводство + ДДС',
      'ТРЗ до 10 служители',
      'Масов експорт на ДДС и ТРЗ (ZIP/XML за НАП)',
      'HR управление и отпуски',
      'Банково равнение (PSD2/CAMT)',
      'Batch export за банкови преводи',
      'Законодателен монитор НАП/НОИ',
      '3 потребители',
    ],
  },
  {
    id: 'pro',
    name: 'Про',
    icon: Sparkles,
    description: 'За по-големи екипи и растящи компании',
    monthlyPrice: 49,
    annualPrice: 39,
    annualTotal: 468,
    isFree: false,
    cta: 'Започни пробния период',
    features: [
      'Всичко от Бизнес',
      'Неограничени служители ТРЗ',
      'AI асистент Claude + OCR',
      'Гласово въвеждане на BG',
      'AI помни историята на фирмата',
      'AI одит на ведомости и главна книга',
      'Директно подаване през НАП/НОИ с ПИК и КЕП',
      'До 10 потребители + права',
      'Приоритетна поддръжка',
    ],
  },
  {
    id: 'accounting_firm',
    name: 'Кантора',
    icon: Scale,
    description: 'За счетоводни кантори с множество клиенти',
    monthlyPrice: 89,
    annualPrice: 71,
    annualTotal: 852,
    isFree: false,
    cta: 'Започни пробния период',
    features: [
      'Всичко от Про',
      'Неограничени клиентски workspace-и',
      'Управление на множество фирми',
      'Консолидирани отчети',
      'Бял етикет (white label)',
      'Приоритетни НАП updates',
      'Неограничени потребители',
      'Dedicated поддръжка',
    ],
  },
];

export default function PricingSection() {
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
            Цени
          </p>
          <h2 className="mb-4 font-mono text-3xl font-bold tracking-tight md:text-4xl">
            Прост, честен план
          </h2>
          <p className="mb-8 text-[#94A3B8]">Без скрити такси. Смени плана по всяко време.</p>

          <div className="inline-flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className={`text-sm ${!isAnnual ? 'font-semibold text-white' : 'text-[#94A3B8]'}`}>
              Месечно
            </span>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              aria-label="Превключи месечно/годишно"
              className="relative h-7 w-14 cursor-pointer rounded-full border border-white/15 bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-[#F59E0B] transition-transform ${
                  isAnnual ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`flex items-center gap-1.5 text-sm ${isAnnual ? 'font-semibold text-white' : 'text-[#94A3B8]'}`}>
              Годишно
              <span className="bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                -20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={
                  plan.featured
                    ? 'relative flex flex-col border border-[#F59E0B]/45 bg-gradient-to-b from-[#F59E0B]/15 to-[#0B1220] p-6'
                    : 'relative flex flex-col border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-white/20'
                }
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4 bg-[#F59E0B] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B1220]">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={16} className={plan.featured ? 'text-[#FBBF24]' : 'text-[#F59E0B]'} />
                    <div className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
                      {plan.name}
                    </div>
                  </div>
                  <div className="mb-4 text-xs text-[#94A3B8]">{plan.description}</div>

                  {plan.isFree ? (
                    <>
                      <div className="font-mono text-3xl font-bold text-white">Безплатно</div>
                      <div className="mt-1 text-xs text-[#64748B]">14 дни · без кредитна карта</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <div className="font-mono text-3xl font-bold text-white">{formatPrice(price)} €</div>
                        <div className="mb-1 text-sm text-[#94A3B8]">/мес</div>
                      </div>
                      <div className="mt-1 text-xs text-[#64748B]">
                        {isAnnual
                          ? `${formatPrice(plan.annualTotal)} € годишно · спестяваш ${formatPrice(
                              Math.round((plan.monthlyPrice - plan.annualPrice) * 12 * 100) / 100,
                            )} €`
                          : 'Таксува се всеки месец'}
                      </div>
                    </>
                  )}
                </div>

                <div className="mb-6 flex-1 space-y-2 text-xs text-[#CBD5E1]">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5">
                      <CheckCircle
                        size={12}
                        className={`mt-0.5 shrink-0 ${plan.featured ? 'text-[#FBBF24]' : 'text-emerald-400'}`}
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
                  href={getPlanHref(plan.id, isAnnual)}
                  className={
                    plan.featured
                      ? 'mt-auto block cursor-pointer bg-[#F59E0B] py-3 text-center text-sm font-semibold text-[#0B1220] transition-colors hover:bg-[#FBBF24]'
                      : plan.isFree
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

        <p className="mt-8 text-center text-xs text-[#64748B]">
          Всички планове включват SSL, автоматични backup-и и GDPR. При годишен план — 2 месеца безплатно.
        </p>
      </div>
    </section>
  );
}
