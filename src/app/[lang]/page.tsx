import Link from 'next/link';
import { ArrowRight, CheckCircle, Shield, FileText, Building2, Clock, TrendingUp } from 'lucide-react';
import OfficiaHero from '@/components/OfficiaHero';
import OfficiaSocialProof from '@/components/OfficiaSocialProof';
import PricingSection from './PricingSection';
import OfficiaFeatures from '@/components/OfficiaFeatures';
import TestimonialsFaq from '@/components/TestimonialsFaq';
import { FaqSchema } from '@/components/JsonLd';
import { AppLogoLink } from '@/components/brand/app-logo-link';

const benefits = [
  'Счетоводство и журнални записи',
  'AI извличане от снимки и PDF',
  'ДДС дневници и ZIP за НАП',
  'Фактури продажби и покупки',
  'ТРЗ и осигуровки',
  'Интерфейс на български език',
  'Защитен вход и tenant изолация',
  'Експорт CSV/Excel/PDF',
];

const trustMetrics = [
  { icon: FileText, value: "10 000+", label: "Фактури на месец" },
  { icon: Building2, value: "100+", label: "Активни фирми" },
  { icon: Clock, value: "10x", label: "По-бързо осчетоводяване" },
  { icon: TrendingUp, value: "97%", label: "Точност на AI OCR" },
];

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <FaqSchema />
      <OfficiaHero lang={lang} />

      <OfficiaFeatures lang={lang} />

      <section className="border-y border-white/5 bg-[#0a0a12] py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustMetrics.map((m) => (
              <div key={m.label} className="flex flex-col items-center text-center gap-2">
                <m.icon className="h-5 w-5 text-purple-400" />
                <span className="text-2xl font-bold text-white">{m.value}</span>
                <span className="text-sm text-zinc-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <OfficiaSocialProof lang={lang} />

      <section className="py-24 px-6 bg-white/2 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-6">Защо Officia?</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">Създаден за българския бизнес — не е превод на западен софтуер, а платформа, написана според изискванията на българското счетоводство и данъчна система.</p>
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
                  <div className="font-semibold">Сигурност по дизайн</div>
                  <div className="text-sm text-zinc-400">Clerk + PostgreSQL + tenant изолация</div>
                </div>
              </div>
              <div className="space-y-4 text-sm text-zinc-400">
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>Clerk автентикация с MFA</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>Всяка фирма вижда само своите данни</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>PostgreSQL + Drizzle ORM</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" /><span>Rate limiting на AI заявките</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsFaq />

      <PricingSection lang={lang} />

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Готов да автоматизираш офиса си?</h2>
          <p className="text-zinc-400 mb-8">14 дни пълен достъп — без кредитна карта, без рискове.</p>
          <Link href={signUpHref} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all px-10 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25">
            Стартирай безплатно <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <AppLogoLink lang={lang} variant="circle" />
          <p className="text-zinc-500 text-sm">© 2026 AgriNexus Ltd. Всички права запазени. info@agrinexus.eu</p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href={`/${lang}/terms`} className="hover:text-white transition-colors">Условия</Link>
            <Link href={`/${lang}/privacy`} className="hover:text-white transition-colors">Поверителност</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
