"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Zap, Building2, Sparkles } from 'lucide-react';

function getPlanHref(planId: string, isAnnual: boolean): string {
  if (planId === 'starter') return '/sign-up';
  const billing = isAnnual ? 'annual' : 'monthly';
  return `/api/stripe/checkout?plan=${planId}&billing=${billing}`;
}

const PLANS = [
  {
    id: 'starter',
    name: 'Стартер',
    icon: Zap,
    iconColor: 'text-emerald-400',
    description: 'За самонаети и микро-фирми',
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    priceLabel: 'Безплатно',
    priceSubLabel: '14 дни · без кредитна карта',
    cta: 'Започни безплатно',
    ctaStyle: 'block text-center border border-white/15 hover:border-white/30 rounded-xl py-3 text-sm font-medium transition-all hover:bg-white/10',
    cardStyle: 'bg-white/3 border border-white/10 rounded-2xl p-8 text-left transition-all hover:bg-white/5',
    features: [
      'До 30 фактури/месец',
      'Основно счетоводство',
      'ДДС дневници (само преглед)',
      '1 потребител',
      '1 банкова сметка',
      'Email поддръжка',
    ],
    notIncluded: ['ТРЗ и HR', 'AI асистент', 'НАП export'],
  },
  {
    id: 'business',
    name: 'Бизнес',
    icon: Building2,
    iconColor: 'text-violet-400',
    description: 'За малки и средни предприятия',
    monthlyPrice: 29,
    annualPrice: 23.20,
    annualTotal: 278.40,
    priceLabel: null,
    priceSubLabel: null,
    badge: 'Препоръчан',
    cta: 'Започни пробния период',
    ctaStyle: 'block text-center bg-white text-violet-700 hover:bg-violet-50 rounded-xl py-3 text-sm font-semibold transition-all shadow-lg hover:shadow-xl',
    cardStyle: 'bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-500/30 rounded-2xl p-8 text-left relative overflow-hidden shadow-2xl shadow-violet-900/50',
    features: [
      'Неограничени фактури и покупки',
      'Пълно счетоводство + ДДС',
      'ТРЗ до 10 служители (Обр.1, Обр.6)',
      'HR управление и отпуски',
      'Банкиране PSD2 / GoCardless',
      'Batch export за банкови преводи',
      '3 потребители',
      'Законодателен монитор НАП/НОИ',
    ],
    featured: true,
  },
  {
    id: 'pro',
    name: 'Про',
    icon: Sparkles,
    iconColor: 'text-amber-400',
    description: 'За счетоводни кантори и растящи компании',
    monthlyPrice: 59,
    annualPrice: 47.20,
    annualTotal: 566.40,
    priceLabel: null,
    priceSubLabel: null,
    cta: 'Свържи се с нас',
    ctaStyle: 'block text-center border border-white/15 hover:border-white/30 rounded-xl py-3 text-sm font-medium transition-all hover:bg-white/10',
    cardStyle: 'bg-white/3 border border-white/10 rounded-2xl p-8 text-left transition-all hover:bg-white/5',
    features: [
      'Всичко от Бизнес',
      'Неограничени служители ТРЗ',
      'AI асистент (Claude) + OCR на фактури',
      'Гласово въвеждане на BG',
      'AI паметова система (RAG)',
      'Автоматичен AI одит на ведомости',
      'НАП директна интеграция',
      'До 10 потребители + права',
      'Приоритетна поддръжка 24/7',
    ],
  },
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
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

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = plan.monthlyPrice === 0
              ? null
              : isAnnual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div key={plan.id} className={plan.cardStyle}>
                {plan.badge && (
                  <div className="absolute top-4 right-4 bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className={plan.featured ? 'text-violet-200' : plan.iconColor} />
                  <div className={`text-sm font-medium uppercase tracking-wider ${plan.featured ? 'text-violet-200' : 'text-zinc-400'}`}>
                    {plan.name}
                  </div>
                </div>
                <div className={`text-sm mb-4 ${plan.featured ? 'text-violet-200' : 'text-zinc-500'}`}>
                  {plan.description}
                </div>

                {/* Price */}
                {price === null ? (
                  <>
                    <div className="text-4xl font-bold mb-1">Безплатно</div>
                    <div className={`text-sm mb-6 ${plan.featured ? 'text-violet-200' : 'text-zinc-500'}`}>
                      14 дни · без кредитна карта
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-1 mb-1">
                      <div className="text-4xl font-bold">{price.toFixed(2).replace('.', ',')} €</div>
                      <div className={`text-lg font-normal mb-1 ${plan.featured ? 'text-violet-200' : 'text-zinc-400'}`}>/мес</div>
                    </div>
                    <div className={`text-sm mb-6 ${plan.featured ? 'text-violet-200' : 'text-zinc-500'}`}>
                      {isAnnual
                        ? `Таксува се ${plan.annualTotal.toFixed(2).replace('.', ',')} € веднъж годишно`
                        : 'Таксува се всеки месец'}
                    </div>
                  </>
                )}

                {/* Features */}
                <div className={`space-y-2.5 text-sm mb-8 ${plan.featured ? 'text-violet-100' : 'text-zinc-400'}`}>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle size={14} className={`shrink-0 mt-0.5 ${plan.featured ? 'text-white' : 'text-emerald-400'}`} />
                      {f}
                    </div>
                  ))}
                  {plan.notIncluded?.map((f) => (
                    <div key={f} className="flex items-start gap-2 opacity-40">
                      <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0 mt-0.5" />
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

        {/* Bottom note */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          Всички планове включват SSL сигурност, автоматични backup-и и съответствие с GDPR.
          При годишен план — 2 месеца безплатно.
        </p>
      </div>
    </section>
  );
}
