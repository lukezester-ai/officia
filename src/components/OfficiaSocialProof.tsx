'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle, FileText, Landmark, Shield, Sparkles } from 'lucide-react';

const capabilities = [
  {
    icon: FileText,
    title: 'Фактури и ДДС',
    text: 'Издаване на фактури, ДДС дневници и ZIP експорт за НАП в работещ начален процес.',
  },
  {
    icon: Sparkles,
    title: 'AI OCR',
    text: 'Извличане на данни от снимки и текстови PDF с Claude. Преглед преди запис.',
  },
  {
    icon: Landmark,
    title: 'Банка (PSD2/CAMT)',
    text: 'Банков импорт чрез PSD2 / MT940 / CAMT. Свързваш сметки или извлечения за синхронизация.',
  },
  {
    icon: Shield,
    title: 'Сигурност',
    text: 'Защитен вход, изолирани фирмени пространства и PostgreSQL. Без подвеждащи обещания.',
  },
];

export default function OfficiaSocialProof({ lang }: { lang: string }) {
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(`/${lang}/dashboard`)}`;
  const prefersReduced = useReducedMotion();

  return (
    <section
      id="social-proof"
      className="relative overflow-hidden px-4 py-20 text-[#F8FAFC] md:px-8"
      style={{ background: '#0B1220' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/40 to-transparent"
      />

      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#F59E0B]">
            Възможности
          </p>
          <motion.h2
            initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 font-mono text-3xl font-bold tracking-tight text-white md:text-5xl"
          >
            Какво получаваш реално
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mx-auto max-w-2xl text-lg text-[#94A3B8]"
          >
            Без измислени отзиви и фалшиви метрики. Ето какво работи в продукта днес.
          </motion.p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-4 md:grid-cols-2">
          {capabilities.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-[#F59E0B]/30"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#F59E0B]/15 text-[#F59E0B]">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-mono text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[#94A3B8]">{item.text}</p>
            </motion.article>
          ))}
        </div>

        <div className="text-center">
          <Link
            href={signUpHref}
            className="group mb-4 inline-flex cursor-pointer items-center gap-3 bg-[#F59E0B] px-10 py-4 font-bold text-[#0B1220] transition-transform hover:-translate-y-0.5 hover:bg-[#FBBF24]"
          >
            <span>Започни безплатно</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="flex items-center justify-center gap-2 text-sm text-[#64748B]">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>14 дни пълен достъп · после лимит 50 фактури/месец (Стартер)</span>
          </p>
        </div>
      </div>
    </section>
  );
}
