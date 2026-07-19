'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

type MobileLabels = {
  features: string;
  pricing: string;
  capabilities: string;
  signIn: string;
  startFree: string;
};

const defaultLabels: MobileLabels = {
  features: 'الميزات',
  pricing: 'الأسعار',
  capabilities: 'الإمكانيات',
  signIn: 'تسجيل الدخول',
  startFree: 'ابدأ مجاناً',
};

export default function MobileMenu({
  lang,
  labels = defaultLabels,
}: {
  lang: string;
  labels?: MobileLabels;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signInHref = `/sign-in?redirect_url=${authRedirect}`;
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute start-0 top-full z-50 flex w-full animate-in fade-in slide-in-from-top-2 flex-col gap-4 border-b border-white/10 bg-zinc-950/98 px-6 py-6 shadow-2xl duration-150 backdrop-blur-2xl">
          <a href="#features" onClick={() => setIsOpen(false)} className="py-2 text-base font-medium text-zinc-300 transition-colors hover:text-white">{labels.features}</a>
          <a href="#pricing" onClick={() => setIsOpen(false)} className="py-2 text-base font-medium text-zinc-300 transition-colors hover:text-white">{labels.pricing}</a>
          <a href="#social-proof" onClick={() => setIsOpen(false)} className="py-2 text-base font-medium text-zinc-300 transition-colors hover:text-white">{labels.capabilities}</a>
          <div className="my-1 h-px bg-white/10" />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-zinc-500">Language</span>
            <LanguageSwitcher currentLang={lang} />
          </div>
          <Link href={signInHref} onClick={() => setIsOpen(false)} className="py-2 text-base font-medium text-zinc-300 transition-colors hover:text-white">{labels.signIn}</Link>
          <Link
            href={signUpHref}
            onClick={() => setIsOpen(false)}
            className="mt-2 rounded-md bg-[#F59E0B] px-4 py-3 text-center text-base font-semibold text-[#0B1220] transition-colors hover:bg-[#FBBF24]"
          >
            {labels.startFree}
          </Link>
        </div>
      )}
    </div>
  );
}
