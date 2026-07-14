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

const PLANS = [
  {
    id: 'starter',
    name: 'Стартер',
    icon: Zap,
    description: 'За самонаети и микро-фирми',
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    isFree: true,
    cardStyle: 'bg-white/3 border border-white/10 rounded-2xl p-7 text-left transition-all hover:bg-white/5 flex flex-col',
    textColor: 'text-zinc-400',
    subTextColor: 'text-zinc-500',
    checkColor: 'text-emerald-400',
    cta: 'Започни безплатно',
    ctaStyle: 'block text-center border border-white/15 hover:border-white/30 rounded-xl py-3 text-sm font-medium transition-all hover:bg-white/10 mt-auto',
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
    cardStyle: 'bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-500/30 rounded-2xl p-7 text-left relative overflow-hidden shadow-2xl shadow-violet-900/50 flex flex-col',
    textColor: 'text-violet-100',
    subTextColor: 'text-violet-200',
    checkColor: 'text-white',
    featured: true,
    cta: 'Започни пробния период',
    ctaStyle: 'block text-center bg-white text-violet-700 hover:bg-violet-50 rounded-xl py-3 text-sm font-semibold transition-all shadow-lg mt-auto',
    features: [
      'Неограничени фактури и покупки',
      'Пълно счетоводство + ДДС',
      'ТРЗ до 10 служители',
      'Обр.1 и Обр.6 XML за НАП',
      'HR управление и отпуски',
      'Банкиране PSD2 / GoCardless',
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
    cardStyle: 'bg-white/3 border border-white/10 rounded-2xl p-7 text-left transition-all hover:bg-white/5 flex flex-col',
    textColor: 'text-zinc-400',
    subTextColor: 'text-zinc-500',
    checkColor: 'text-emerald-400',
    cta: 'Започни пробния период',
    ctaStyle: 'block text-center border border-violet-500/40 hover:border-violet-400 text-violet-400 hover:bg-violet-500/10 rounded-xl py-3 text-sm font-semibold transition-all mt-auto',
    features: [
      'Всичко от Бизнес',
      'Неограничени служители ТРЗ',
      'AI асистент Claude + OCR',
      'Гласово въвеждане на BG',
      'AI паметова система (RAG)',
      'AI одит на ведомости',
      'НАП директна интеграция',
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
    cardStyle: 'bg-white/3 border border-amber-500/20 rounded-2xl p-7 text-left transition-all hover:bg-amber-500/5 flex flex-col',
    textColor: 'text-zinc-400',
    subTextColor: 'text-zinc-500',
    checkColor: 'text-amber-400',
    cta: 'Започни пробния период',
    ctaStyle: 'block text-center border border-amber-500/40 hover:border-amber-400 text-amber-400 hover:bg-amber-500/10 rounded-xl py-3 text-sm font-semibold transition-all mt-auto',
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
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Прост, честен ценови план</h2>
          <p className="text-zinc-400 mb-8">Без скрити такси. Без изненади. Смени плана по всяко време.</p>

          <div className="flex justify-center items-center gap-3">
            <span className={`text-sm ${!isAnnual ? 'text-white font-semibold' : 'text-zinc-400'}`}>Месечно</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 bg-white/10 rounded-full border border-white/20 transition-colors focus:outline-none"
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-indigo-500 rounded-full transition-transform ${isAnnual ? 'translate-x-7' : ''}`} />
            </button>
            <span className={`text-sm flex items-center gap-1.5 ${isAnnual ? 'text-white font-semibold' : 'text-zinc-400'}`}>
              Годишно
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                -20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div key={plan.id} className={plan.cardStyle}>
                {plan.badge && (
                  <div className="absolute top-4 right-4 bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={plan.featured ? 'text-violet-200' : plan.checkColor} />
                    <div className={`text-xs font-semibold uppercase tracking-wider ${plan.featured ? 'text-violet-200' : plan.textColor}`}>
                      {plan.name}
                    </div>
                  </div>
                  <div className={`text-xs mb-4 ${plan.subTextColor}`}>{plan.description}</div>

                  {plan.isFree ? (
                    <>
                      <div className="text-3xl font-bold text-white">Безплатно</div>
                      <div className={`text-xs mt-1 ${plan.subTextColor}`}>14 дни · без кредитна карта</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <div className="text-3xl font-bold text-white">{formatPrice(price)} €</div>
                        <div className={`text-sm mb-1 ${plan.subTextColor}`}>/мес</div>
                      </div>
                      <div className={`text-xs mt-1 ${plan.subTextColor}`}>
                        {isAnnual
                          ? `${formatPrice(plan.annualTotal)} € годишно · спестяваш ${formatPrice(Math.round((plan.monthlyPrice - plan.annualPrice) * 12 * 100) / 100)} €`
                          : 'Таксува се всеки месец'}
                      </div>
                    </>
                  )}
                </div>

                <div className={`space-y-2 text-xs mb-6 flex-1 ${plan.featured ? 'text-violet-100' : plan.textColor}`}>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5">
                      <CheckCircle size={12} className={`shrink-0 mt-0.5 ${plan.checkColor}`} />
                      {f}
                    </div>
                  ))}
                  {plan.locked?.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 opacity-35">
                      <div className="w-3 h-3 rounded-full border border-zinc-600 shrink-0 mt-0.5 flex-none" />
                      {f}
                    </div>
                  ))}
                </div>

                <Link href={getPlanHref(plan.id, isAnnual)} className={plan.ctaStyle}>
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          Всички планове включват SSL, автоматични backup-и и съответствие с GDPR. При годишен план — 2 месеца безплатно.
        </p>
      </div>
    </section>
  );
}
