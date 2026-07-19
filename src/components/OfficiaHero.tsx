"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import MobileMenu from "@/components/mobile-menu";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Officia landing hero — brand-first, full-bleed atmosphere.
 * Design: industrial ledger / gold-trust fintech (design-system/officia).
 * First viewport budget: brand · one headline · one sentence · CTAs · dominant visual.
 */
export default function OfficiaHero({ lang }: { lang: string }) {
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signInHref = `/sign-in?redirect_url=${authRedirect}`;
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;
  const shouldReduceMotion = useReducedMotion();
  const skip = shouldReduceMotion ?? false;

  return (
    <div className="officia-hero relative min-h-[100dvh] overflow-hidden text-[#F8FAFC]">
      <style>{`
        .officia-hero {
          --officia-bg: #0B1220;
          --officia-ink: #F8FAFC;
          --officia-gold: #F59E0B;
          --officia-gold-soft: #FBBF24;
          --officia-muted: #94A3B8;
          background-color: var(--officia-bg);
          font-family: var(--font-fira-sans), 'Fira Sans', sans-serif;
        }

        .officia-hero__plane {
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 90% 70% at 18% 20%, rgba(245, 158, 11, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 88% 75%, rgba(148, 163, 184, 0.08) 0%, transparent 50%),
            linear-gradient(165deg, #101B2E 0%, #0B1220 42%, #070C16 100%);
        }

        .officia-hero__ledger {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.35;
          background-image:
            linear-gradient(rgba(248, 250, 252, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(248, 250, 252, 0.035) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 75% 65% at 70% 55%, black 20%, transparent 75%);
        }

        .officia-hero__product {
          position: absolute;
          right: -8%;
          bottom: -6%;
          width: min(72vw, 920px);
          aspect-ratio: 16 / 10;
          z-index: 1;
          border-radius: 0;
          background:
            linear-gradient(145deg, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.2) 100%);
          border-top: 1px solid rgba(248, 250, 252, 0.08);
          border-left: 1px solid rgba(248, 250, 252, 0.06);
          box-shadow: -40px -20px 80px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          transform: perspective(1400px) rotateY(-8deg) rotateX(4deg);
          transform-origin: right bottom;
        }

        .officia-hero__product::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, transparent 28%),
            repeating-linear-gradient(
              180deg,
              transparent,
              transparent 28px,
              rgba(248, 250, 252, 0.03) 28px,
              rgba(248, 250, 252, 0.03) 29px
            );
        }

        .officia-hero__product-chrome {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 14%;
          border-bottom: 1px solid rgba(248, 250, 252, 0.06);
          background: rgba(15, 23, 42, 0.55);
        }

        .officia-hero__product-rail {
          position: absolute;
          top: 14%;
          left: 0;
          bottom: 0;
          width: 18%;
          border-right: 1px solid rgba(248, 250, 252, 0.05);
          background: rgba(11, 18, 32, 0.65);
        }

        .officia-hero__product-lines {
          position: absolute;
          top: 22%;
          left: 24%;
          right: 6%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .officia-hero__product-lines span {
          display: block;
          height: 10px;
          border-radius: 2px;
          background: rgba(248, 250, 252, 0.08);
        }

        .officia-hero__product-lines span:nth-child(1) { width: 42%; background: rgba(245, 158, 11, 0.35); }
        .officia-hero__product-lines span:nth-child(2) { width: 88%; }
        .officia-hero__product-lines span:nth-child(3) { width: 76%; }
        .officia-hero__product-lines span:nth-child(4) { width: 64%; }
        .officia-hero__product-lines span:nth-child(5) { width: 81%; }
        .officia-hero__product-lines span:nth-child(6) { width: 55%; background: rgba(245, 158, 11, 0.18); }

        .officia-hero__ambient {
          position: absolute;
          width: 42vw;
          height: 42vw;
          left: -8%;
          top: 10%;
          z-index: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 68%);
          filter: blur(8px);
          pointer-events: none;
        }

        @keyframes officiaAmbientDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.85; }
          50% { transform: translate3d(3%, 2%, 0) scale(1.06); opacity: 1; }
        }

        .officia-hero__ambient--motion {
          animation: officiaAmbientDrift 12s ease-in-out infinite;
        }

        .officia-cta {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%);
          color: #0B1220;
        }

        .officia-cta::after {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-14deg);
        }

        .officia-cta:hover::after {
          animation: officiaCtaShine 0.55s ease-out forwards;
        }

        @keyframes officiaCtaShine {
          to { transform: translateX(280%) skewX(-14deg); }
        }

        @media (max-width: 900px) {
          .officia-hero__product {
            right: -20%;
            bottom: -4%;
            width: 110vw;
            opacity: 0.55;
            transform: perspective(1000px) rotateY(-4deg) rotateX(2deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .officia-hero__ambient--motion { animation: none; }
          .officia-cta::after { display: none; }
        }
      `}</style>

      {/* Full-bleed visual plane */}
      <div className="officia-hero__plane" aria-hidden />
      <div className="officia-hero__ledger" aria-hidden />
      <div
        className={`officia-hero__ambient ${skip ? "" : "officia-hero__ambient--motion"}`}
        aria-hidden
      />
      <div className="officia-hero__product" aria-hidden>
        <div className="officia-hero__product-chrome" />
        <div className="officia-hero__product-rail" />
        <div className="officia-hero__product-lines">
          <span /><span /><span /><span /><span /><span />
        </div>
      </div>

      <nav className="relative z-20 border-b border-white/8 bg-[#0B1220]/55 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-20">
          <Link href={`/${lang}`} className="group flex items-center gap-3 cursor-pointer">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F59E0B] font-mono text-lg font-bold text-[#0B1220] transition-transform duration-200 group-hover:scale-[1.03]">
              O
            </span>
            <span className="font-mono text-xl font-semibold tracking-tight text-[#F8FAFC] md:text-2xl">
              Officia
            </span>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            <a href="#features" className="cursor-pointer text-sm font-medium text-[#94A3B8] transition-colors duration-200 hover:text-[#F8FAFC]">
              Функции
            </a>
            <a href="#pricing" className="cursor-pointer text-sm font-medium text-[#94A3B8] transition-colors duration-200 hover:text-[#F8FAFC]">
              Цени
            </a>
            <a href="#social-proof" className="cursor-pointer text-sm font-medium text-[#94A3B8] transition-colors duration-200 hover:text-[#F8FAFC]">
              Възможности
            </a>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <Link href={signInHref} className="cursor-pointer text-sm font-medium text-[#94A3B8] transition-colors duration-200 hover:text-[#FBBF24]">
              Вход
            </Link>
            <Link
              href={signUpHref}
              className="officia-cta cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-transform duration-200 hover:-translate-y-px active:translate-y-0"
            >
              Започни безплатно
            </Link>
          </div>

          <MobileMenu lang={lang} />
        </div>
      </nav>

      <main className="relative z-10 flex min-h-[calc(100dvh-5rem)] items-center px-6 pb-16 pt-10 md:pb-24 md:pt-6">
        <section className="mx-auto w-full max-w-7xl">
          <div className="max-w-xl md:max-w-2xl">
            {/* Brand as hero-level signal */}
            <motion.h1
              initial={skip ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: skip ? 0 : 0.05 }}
              className="font-mono font-bold tracking-[-0.04em] text-[#F8FAFC]"
              style={{ fontSize: "clamp(3.4rem, 11vw, 7.5rem)", lineHeight: 0.92 }}
            >
              Officia
            </motion.h1>

            <motion.p
              initial={skip ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: skip ? 0 : 0.18 }}
              className="mt-5 max-w-lg text-xl font-medium tracking-tight text-[#F8FAFC] md:text-2xl md:leading-snug"
            >
              Интелигентният офис за българския бизнес.
            </motion.p>

            <motion.p
              initial={skip ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: skip ? 0 : 0.3 }}
              className="mt-4 max-w-md text-base leading-relaxed text-[#94A3B8] md:text-lg"
            >
              AI върши рутината. Ти утвърждаваш готовите отчети, фактури и ДДС.
            </motion.p>

            <motion.div
              initial={skip ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: skip ? 0 : 0.42 }}
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href={signUpHref}
                className="officia-cta group inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-7 py-3.5 text-base font-bold transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Започни безплатно
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={`/${lang}/dashboard`}
                className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/20 bg-white/[0.03] px-7 py-3.5 text-base font-semibold text-[#F8FAFC] transition-colors duration-200 hover:border-[#F59E0B]/50 hover:text-[#FBBF24]"
              >
                Виж демо
              </Link>
            </motion.div>

            <motion.p
              initial={skip ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: skip ? 0 : 0.55 }}
              className="mt-5 text-sm text-[#64748B]"
            >
              14 дни пълен достъп · без кредитна карта
            </motion.p>
          </div>
        </section>
      </main>
    </div>
  );
}
