"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import MobileMenu from "@/components/mobile-menu";
import { cn } from "@/lib/utils";

type MetricItem = {
  id: string;
  numericValue: number;
  suffix: string;
  label: string;
  highlightColor: "purple" | "white";
  hasTrend?: boolean;
};

const metricsData: MetricItem[] = [
  { id: "trial", numericValue: 14, suffix: " дни", label: "Пълен достъп при регистрация", highlightColor: "purple" },
  { id: "starter", numericValue: 50, suffix: "", label: "Фактури/месец (Стартер)", highlightColor: "white" },
  { id: "modules", numericValue: 5, suffix: "", label: "Модула: счетоводство, фактури, ТРЗ, HR, банкиране", highlightColor: "purple" },
  { id: "lang", numericValue: 1, suffix: "", label: "Език: BG", highlightColor: "purple" },
];

const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];

function useCountUp(target: number, duration = 1800, start = false, skip = false) {
  const [count, setCount] = React.useState(target);

  React.useEffect(() => {
    if (skip) {
      setCount(target);
      return;
    }
    if (!start) return;

    setCount(0);
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      startTime ??= timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [duration, skip, start, target]);

  return count;
}

function MetricTicker({ item, skip }: { item: MetricItem; skip: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const count = useCountUp(item.numericValue, 1600, isInView, skip);
  const display = item.numericValue >= 1000 ? `${Math.floor(count / 1000)} ${String(count % 1000).padStart(3, "0")}` : String(count);

  return (
    <div ref={ref} className="flex flex-col items-center px-2 sm:px-5 py-3 sm:py-4 text-center lg:items-start lg:py-0 lg:text-left group">
      <div className="mb-1 flex items-center gap-2">
        <span className={cn("text-xl font-bold tabular-nums tracking-tight transition-transform duration-300 group-hover:scale-105", item.highlightColor === "purple" ? "text-[#a78bfa]" : "text-[#e8e8f0]")}>{display}{item.suffix}</span>
        {item.hasTrend ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : null}
      </div>
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b6b8a]">{item.label}</span>
    </div>
  );
}

function MetricsStrip({ skipAnimations }: { skipAnimations: boolean }) {
  return (
    <motion.div
      initial={skipAnimations ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutQuart, delay: skipAnimations ? 0 : 0.9 }}
      className="mt-24 w-full border-y border-white/[0.06] bg-[#111120] py-8"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-0">
          <div className="flex items-center gap-2 pr-8 lg:border-r lg:border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Работеща начална версия</span>
          </div>
          <div className="grid w-full flex-1 grid-cols-2 divide-white/[0.06] md:grid-cols-4 lg:divide-x">
            {metricsData.map((item) => <MetricTicker key={item.id} item={item} skip={skipAnimations} />)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function OfficiaHero({ lang }: { lang: string }) {
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signInHref = `/sign-in?redirect_url=${authRedirect}`;
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;
  const shouldReduceMotion = useReducedMotion();
  const skip = shouldReduceMotion ?? false;

  return (
    <div className="min-h-screen overflow-x-hidden text-white selection:bg-purple-500/30" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, #14122a 0%, #09090f 60%)", backgroundColor: "#09090f" }}>
      <style>{`
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3), 0 0 18px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 0 3px rgba(124,58,237,0.15), 0 0 18px rgba(124,58,237,0.7); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        .officia-cta-shimmer { position: relative; overflow: hidden; }
        .officia-cta-shimmer::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 40%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%); transform: translateX(-120%) skewX(-15deg); }
        .officia-cta-shimmer:hover::after { animation: shimmer 0.6s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .officia-cta-shimmer::after { display: none; } }
      `}</style>

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-[#09090f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href={`/${lang}`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-xl font-bold text-white shadow-lg shadow-purple-700/30">O</div>
            <span className="text-2xl font-bold tracking-tight text-white">Officia</span>
          </Link>
          <div className="hidden items-center gap-10 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-400 transition-colors hover:text-[#a78bfa]">Функции</a>
            <a href="#pricing" className="text-sm font-medium text-gray-400 transition-colors hover:text-[#a78bfa]">Цени</a>
            <a href="#social-proof" className="text-sm font-medium text-gray-400 transition-colors hover:text-[#a78bfa]">Възможности</a>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <Link href={signInHref} className="text-sm font-medium text-gray-400 transition-colors hover:text-[#a78bfa]">Вход</Link>
            <Link href={signUpHref} className="rounded-lg bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-700/30 transition-transform hover:scale-[1.02] active:scale-[0.98]">Започни безплатно</Link>
          </div>
          <MobileMenu lang={lang} />
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <section className="mx-auto max-w-7xl px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.div initial={skip ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: easeOutQuart, delay: skip ? 0 : 0.1 }} className="mb-10 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-[#c4b5fd]" style={{ animation: skip ? "none" : "badgePulse 2s ease-in-out infinite" }}>
              <Zap className="h-3.5 w-3.5 text-[#a78bfa]" />
              <span>Счетоводителят като финансов директор</span>
            </motion.div>

            <div className="mb-8 font-bold" style={{ fontSize: "clamp(2.1rem, 6.5vw + 0.8rem, 5.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              <motion.div initial={skip ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeOutQuart, delay: skip ? 0 : 0.2 }}>Интелигентният офис</motion.div>
              <motion.div initial={skip ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeOutQuart, delay: skip ? 0 : 0.35 }}>
                <span className="bg-gradient-to-br from-[#a78bfa] via-[#7c3aed] to-[#6d28d9] bg-clip-text text-transparent">за твоя бизнес</span>
              </motion.div>
            </div>

            <motion.p initial={skip ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOutQuart, delay: skip ? 0 : 0.5 }} className="mb-12 max-w-3xl text-lg leading-relaxed text-[#9191b0] md:text-xl font-medium">
              В <span className="text-white font-bold">Officia</span> счетоводителят е <span className="text-purple-300 font-semibold">финансов директор</span>, на когото AI асистентът върши 90% от рутинната работа автоматично и му показва готови, проверени и балансирани отчети!
            </motion.p>

            <motion.div initial={skip ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeOutQuart, delay: skip ? 0 : 0.65 }} className="flex flex-col items-center gap-4 sm:flex-row">
              <Link href={signUpHref} className="officia-cta-shimmer group flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] px-8 py-5 text-lg font-bold text-white shadow-[0_8px_32px_rgba(109,40,217,0.45)] transition-transform hover:scale-[1.02] active:scale-[0.97]">
                <span>Започни безплатно</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
              <Link href={`/${lang}/dashboard`} className="flex items-center gap-3 rounded-2xl border border-white/60 px-8 py-5 text-lg font-bold text-[#d0d0f0] transition-all hover:border-white/75 hover:bg-white/6 active:scale-[0.97]">
                <span>Виж демо</span>
              </Link>
            </motion.div>

            <motion.div initial={skip ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: skip ? 0 : 0.8 }} className="mt-6 flex items-center gap-2 text-sm font-medium text-[#6b6b8a]">
              <CheckCircle2 className="h-4 w-4 text-[#7c3aed]/60" />
              <span>14 дни пълен достъп · без кредитна карта</span>
            </motion.div>
          </div>
        </section>

        <MetricsStrip skipAnimations={skip} />
      </main>
    </div>
  );
}
