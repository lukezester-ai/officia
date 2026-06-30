'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle, FileText, Landmark, Shield, Sparkles } from 'lucide-react';

const capabilities = [
  {
    icon: FileText,
    title: 'Фактури и ДДС',
    text: 'Издаване на фактури, ДДС дневници и ZIP експорт за НАП (MVP workflow).',
  },
  {
    icon: Sparkles,
    title: 'AI OCR',
    text: 'Извличане на данни от снимки и текстови PDF с Claude. Преглед преди запис.',
  },
  {
    icon: Landmark,
    title: 'Банка (демо)',
    text: 'Демо синхронизация за тестване. Реален PSD2 конектор — в roadmap.',
  },
  {
    icon: Shield,
    title: 'Сигурност',
    text: 'Clerk вход, изолирани workspace-ове и PostgreSQL. Без фалшиви SLA обещания.',
  },
];

export default function OfficiaSocialProof({ lang }: { lang: string }) {
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(`/${lang}/dashboard`)}`;
  const prefersReduced = useReducedMotion();

  return (
    <section id="social-proof" className="relative overflow-hidden px-4 py-20 text-slate-100 md:px-8" style={{ background: '#0d0d14' }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl"
          >
            Какво получаваш реално
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-lg text-slate-400"
          >
            Без измислени отзиви и фалшиви метрики. Ето какво работи в продукта днес.
          </motion.p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {capabilities.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-purple-500/10 bg-[#1a1a2e] p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/20 text-[#a78bfa]">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{item.text}</p>
            </motion.article>
          ))}
        </div>

        <div className="text-center">
          <Link
            href={signUpHref}
            className="group mb-4 inline-flex items-center gap-3 rounded-full bg-[#7c3aed] px-10 py-4 font-bold text-white shadow-[0_12px_40px_rgba(124,58,237,0.25)] transition-all hover:bg-[#6d28d9] hover:scale-[1.02]"
          >
            <span>Започни безплатно</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>14 дни пълен достъп · после лимит 50 фактури/месец (Стартер)</span>
          </p>
        </div>
      </div>
    </section>
  );
}
