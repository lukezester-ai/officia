"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  FileText,
  Landmark,
  Package,
  Users,
} from "lucide-react";

type FeatureItem = {
  tag: string;
  title: string;
  description: string;
  tags: string[];
};

type FeaturesCopy = {
  eyebrow: string;
  title: string;
  text: string;
  startFree: string;
  items: FeatureItem[];
};

const icons = [BarChart3, Bot, Package, Users, Landmark, FileText];

export default function OfficiaFeatures({ lang, copy }: { lang: string; copy: FeaturesCopy }) {
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(`/${lang}/dashboard`)}`;
  const prefersReduced = useReducedMotion();
  const rtl = lang === "ar";
  const CtaArrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <section id="features" className="relative overflow-hidden px-6 py-24 text-[#F8FAFC]" style={{ background: "#0B1220" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 80% 10%, rgba(245,158,11,0.08) 0%, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#F59E0B]">
            {copy.eyebrow}
          </p>
          <motion.h2
            initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 font-mono text-3xl font-bold tracking-tight md:text-5xl"
          >
            {copy.title}
          </motion.h2>
          <p className="text-lg text-[#94A3B8]">{copy.text}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {copy.items.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-[#F59E0B]/35"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F59E0B]/15 text-[#F59E0B]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
                    {item.tag}
                  </span>
                </div>
                <h3 className="mb-2 font-mono text-lg font-semibold text-white">{item.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-[#94A3B8]">{item.description}</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-12">
          <Link
            href={signUpHref}
            className="group inline-flex cursor-pointer items-center gap-2 bg-[#F59E0B] px-7 py-3.5 font-bold text-[#0B1220] transition-transform hover:-translate-y-0.5 hover:bg-[#FBBF24]"
          >
            {copy.startFree}
            <CtaArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
