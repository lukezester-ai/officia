'use client';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import OfficiaHero from '@/components/OfficiaHero';
import OfficiaSocialProof from '@/components/OfficiaSocialProof';
import PricingSection from './PricingSection';
import OfficiaFeatures from '@/components/OfficiaFeatures';

const benefits = [
  'Пълно счетоводство по ЗДДС',
  'AI извличане на данни от документи',
  'Автоматично ДДС осчетоводяване',
  'Многопотребителски достъп',
  'Тъмен и светъл режим',
  'Мобилно-приятелски дизайн',
  'Безопасен cloud достъп',
  'Поддръжка на български и английски',
];

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <OfficiaHero lang={lang} />

      <OfficiaFeatures lang={lang} />

      <OfficiaSocialProof lang={lang} />

      <section className="py-24 px-6 bg-white/2 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-6">Защо Officia?</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">Разработен специално за нуждите на българското счетоводство и бизнес среда. Не е адаптация на западен продукт — това е нещо, направено тук, за тук.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {benefits.map(b => (
                  <div key={b} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                    <span className="text-zinc-300">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center"><Shield size={18} /></div>
                <div>
                  <div className="font-semibold">Сигурен и надежден</div>
                  <div className="text-sm text-zinc-400">Enterprise-grade сигурност</div>
                </div>
              </div>
              <div className="space-y-4 text-sm text-zinc-400">
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>Clerk автентикация с MFA и SSO поддръжка</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>Multi-tenant архитектура — данните ти са изолирани</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>PostgreSQL с Drizzle ORM за надеждно съхранение</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>Автоматични бекъпи и cloud хостинг</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PricingSection lang={lang} />

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Готов да автоматизираш офиса си?</h2>
          <p className="text-zinc-400 mb-8">Присъедини се към фирмите, които вече работят по-умно с Officia.</p>
          <Link href={signUpHref} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all px-10 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25">
            Стартирай безплатно <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center font-bold text-sm">O</div>
            <span className="font-semibold">Officia</span>
          </div>
          <p className="text-zinc-500 text-sm">© 2026 Officia. Направено с ❤️ за българския бизнес.</p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Условия</a>
            <a href="#" className="hover:text-white transition-colors">Поверителност</a>
          </div>
        </div>
      </footer>
    </div>
  );
}