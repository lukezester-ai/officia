import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import OfficiaHero from '@/components/OfficiaHero';
import OfficiaSocialProof from '@/components/OfficiaSocialProof';
import PricingSection from './PricingSection';
import OfficiaFeatures from '@/components/OfficiaFeatures';
import { AppLogoLink } from '@/components/brand/app-logo-link';
import { getDictionary } from '@/lib/get-dictionary';
import { defaultLocale, isLocale } from '@/lib/i18n';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const lang = isLocale(rawLang) ? rawLang : defaultLocale;
  const dict = await getDictionary(lang);
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;
  const rtl = lang === 'ar';
  const CtaArrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC]" dir={rtl ? 'rtl' : 'ltr'}>
      <OfficiaHero
        lang={lang}
        copy={{
          brand: dict.landing.brand,
          headline: dict.landing.headline,
          subhead: dict.landing.subhead,
          trialNote: dict.landing.trialNote,
          features: dict.common.features,
          pricing: dict.common.pricing,
          capabilities: dict.common.capabilities,
          signIn: dict.common.signIn,
          startFree: dict.common.startFree,
          seeDemo: dict.common.seeDemo,
        }}
      />

      <OfficiaFeatures
        lang={lang}
        copy={{
          eyebrow: dict.landing.featuresEyebrow,
          title: dict.landing.featuresTitle,
          text: dict.landing.featuresText,
          startFree: dict.common.startFree,
          items: dict.landing.featureItems,
        }}
      />

      <OfficiaSocialProof
        lang={lang}
        copy={{
          eyebrow: dict.landing.capabilitiesEyebrow,
          title: dict.landing.capabilitiesTitle,
          text: dict.landing.capabilitiesText,
          startFree: dict.common.startFree,
          trialNote: dict.landing.trialNote,
          items: dict.landing.capabilityItems,
        }}
      />

      <section className="border-y border-white/5 bg-white/[0.02] px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-4xl font-bold tracking-tight">{dict.landing.whyTitle}</h2>
              <p className="mb-8 leading-relaxed text-zinc-400">{dict.landing.whyText}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {dict.landing.benefits.map((b: string) => (
                  <div key={b} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                    <span className="text-zinc-300">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-slate-900/40 p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F59E0B] text-[#0B1220]">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="font-semibold">{dict.landing.securityTitle}</div>
                  <div className="text-sm text-zinc-400">{dict.landing.securitySub}</div>
                </div>
              </div>
              <div className="space-y-4 text-sm text-zinc-400">
                {[dict.landing.security1, dict.landing.security2, dict.landing.security3, dict.landing.security4].map(
                  (line: string) => (
                    <div key={line} className="flex items-start gap-3">
                      <CheckCircle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                      <span>{line}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PricingSection copy={dict.pricing} />

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">{dict.landing.ctaTitle}</h2>
          <p className="mb-8 text-zinc-400">{dict.landing.ctaText}</p>
          <Link
            href={signUpHref}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#F59E0B] px-10 py-4 text-lg font-semibold text-[#0B1220] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#FBBF24]"
          >
            {dict.common.startFree} <CtaArrow size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <AppLogoLink lang={lang} variant="circle" />
          <p className="text-sm text-zinc-500">{dict.landing.footerCopy}</p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href={`/${lang}/terms`} className="transition-colors hover:text-white">
              {dict.common.terms}
            </Link>
            <Link href={`/${lang}/privacy`} className="transition-colors hover:text-white">
              {dict.common.privacy}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
