"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricData = {
  value: number;
  suffix: string;
  label: string;
  isPurple: boolean;
  hasTrend: boolean;
};

type TestimonialData = {
  quote: string;
  name: string;
  title: string;
  company: string;
  size: string;
  initials: string;
  isFeatured: boolean;
};

const metrics: MetricData[] = [
  { value: 500, suffix: "+", label: "Активни фирми в България", isPurple: true, hasTrend: true },
  { value: 10000, suffix: "+", label: "Обработени фактури", isPurple: false, hasTrend: true },
  { value: 98, suffix: "%", label: "Доволни клиенти", isPurple: true, hasTrend: false },
  { value: 14, suffix: " дни", label: "Безплатен trial", isPurple: false, hasTrend: false },
];

const testimonials: TestimonialData[] = [
  {
    quote: "Officia ни спести над 40 часа месечно. ДДС дневниците се генерират автоматично и качеството е безупречно.",
    name: "Мария Иванова",
    title: "Главен счетоводител",
    company: "ТехКорп ЕООД · София",
    size: "23 служители",
    initials: "МИ",
    isFeatured: false,
  },
  {
    quote: "Качих снимка на фактура и за секунди AI я осчетоводи. Това промени начина, по който работим с документи.",
    name: "Иван Димитров",
    title: "Управител",
    company: "BuildM ООД · Пловдив",
    size: "8 служители",
    initials: "ИД",
    isFeatured: true,
  },
  {
    quote: "Банковата синхронизация работи отлично. Повечето транзакции се съпоставят автоматично и екипът ни вижда всичко навреме.",
    name: "Петя Георгиева",
    title: "Финансов директор",
    company: "SoftSolutions АД · Варна",
    size: "47 служители",
    initials: "ПГ",
    isFeatured: false,
  },
];

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const prefersReduced = useReducedMotion();

  const start = React.useCallback(() => {
    if (started) return;
    setStarted(true);
    if (prefersReduced) {
      setCount(target);
      return;
    }

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [duration, prefersReduced, started, target]);

  return { count, start };
}

function MetricItem({ value, suffix, label, isPurple, hasTrend }: MetricData) {
  const { count, start } = useCountUp(value);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [start]);

  const formatted = value >= 10000 ? `${Math.floor(count / 1000)} ${String(count % 1000).padStart(3, "0")}` : `${count}`;

  return (
    <div ref={ref} className="flex flex-col items-center justify-center p-6 text-center md:items-start md:text-left">
      <div className="flex items-center gap-2">
        <span className={cn("text-3xl font-bold tracking-tight tabular-nums md:text-4xl", isPurple ? "text-[#7c3aed]" : "text-white")}>{formatted}{suffix}</span>
        {hasTrend ? <TrendingUp className="h-5 w-5 shrink-0 text-emerald-500" /> : null}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-400">{label}</p>
    </div>
  );
}

function TestimonialCard({ quote, name, title, company, size, initials, isFeatured }: TestimonialData) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.article
      initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("relative flex h-full flex-col rounded-2xl border p-8 transition-all duration-200", isFeatured ? "-translate-y-1 border-[rgba(124,58,237,0.4)] bg-[#1a1a2e] shadow-[0_20px_60px_rgba(124,58,237,0.2)]" : "border-purple-500/10 bg-[#1a1a2e] hover:border-[rgba(124,58,237,0.5)]")}
    >
      <span aria-hidden="true" className="pointer-events-none absolute left-6 top-5 select-none font-serif text-[64px] font-bold leading-none text-[rgba(124,58,237,0.4)]">&quot;</span>
      <div className="mb-6 mt-2 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
      </div>
      <blockquote className="flex-grow">
        <p className="text-[15px] italic leading-[1.65] text-slate-200">{quote}</p>
      </blockquote>
      <div className="mt-8 border-t border-slate-700/50 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-sm font-bold text-white">{initials}</div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-slate-400">{title}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{company}</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>{size}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function OfficiaSocialProof() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="social-proof" className="relative overflow-hidden px-4 py-20 text-slate-100 selection:bg-[#7c3aed]/30 md:px-8" style={{ background: "#0d0d14" }}>
      <div className="absolute left-0 top-0 w-full border-b border-slate-800/50 bg-[#111120]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-800/50 md:grid-cols-4">
          {metrics.map((metric) => <MetricItem key={metric.label} {...metric} />)}
        </div>
      </div>

      <div className="mx-auto mt-28 max-w-7xl">
        <div className="mb-20 text-center">
          <motion.h2 initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">Какво казват клиентите ни</motion.h2>
          <motion.p initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg text-slate-400">Над 500+ български фирми вече се доверяват на Officia.</motion.p>
        </div>

        <div className="relative mb-24 grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(124,58,237,0.05)] blur-[120px]" />
          {testimonials.map((testimonial) => <TestimonialCard key={testimonial.name} {...testimonial} />)}
        </div>

        <div className="text-center">
          <motion.div initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="inline-flex flex-col items-center">
            <h3 className="mb-8 text-xl font-medium text-slate-200">Присъедини се към 500+ фирми</h3>
            <Link href="/sign-up" className="group mb-4 flex items-center gap-3 rounded-full bg-[#7c3aed] px-10 py-4 font-bold text-white shadow-[0_12px_40px_rgba(124,58,237,0.25)] transition-all hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98]">
              <span>Започни безплатно</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Без кредитна карта · 14 дни пълен достъп</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}