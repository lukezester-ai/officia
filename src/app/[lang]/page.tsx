import Link from 'next/link';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import OfficiaHero from '@/components/OfficiaHero';
import OfficiaSocialProof from '@/components/OfficiaSocialProof';
import PricingSection from './PricingSection';
import OfficiaFeatures from '@/components/OfficiaFeatures';
import { AppLogoLink } from '@/components/brand/app-logo-link';

const benefits = [
  'Счетоводство и журнални записи',
  'Извличане с изкуствен интелект от снимки и PDF',
  'ДДС дневници и ZIP за НАП',
  'Фактури продажби и покупки',
  'Човешки ресурси и изчисляване на заплати',
  'Интерфейс на български език',
  'Защитен вход и изолация на фирмените данни',
  'Експорт CSV/Excel/PDF (отчети)',
];

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC]">
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
            <div className="border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-slate-900/40 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F59E0B] text-[#0B1220]"><Shield size={18} /></div>
                <div>
                  <div className="font-semibold">Сигурност по дизайн</div>
                  <div className="text-sm text-zinc-400">Clerk + PostgreSQL + tenant изолация</div>
                </div>
              </div>
              <div className="space-y-4 text-sm text-zinc-400">
                <div className="flex items-start gap-3"><CheckCircle size={14} className="mt-0.5 shrink-0 text-amber-400" /><span>Clerk автентикация (MFA/SSO чрез Clerk настройки)</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="mt-0.5 shrink-0 text-amber-400" /><span>Всяка фирма вижда само своите данни</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="mt-0.5 shrink-0 text-amber-400" /><span>PostgreSQL + Drizzle ORM</span></div>
                <div className="flex items-start gap-3"><CheckCircle size={14} className="mt-0.5 shrink-0 text-amber-400" /><span>Ограничаване на заявките към разпознаването и изкуствения интелект</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Готов да автоматизираш офиса си?</h2>
          <p className="text-zinc-400 mb-8">Регистрирай се безплатно — 14 дни пълен достъп, после честни лимити по план.</p>
          <Link href={signUpHref} className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#F59E0B] px-10 py-4 text-lg font-semibold text-[#0B1220] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#FBBF24]">
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
