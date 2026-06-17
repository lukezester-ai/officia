import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  LockKeyhole,
  Mail,
  ReceiptText,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { WaitlistForm } from "@/components/waitlist-form";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Home() {
  const t = useTranslations("Home");

  const modules = [
    {
      name: t("modules.m1Title"),
      description: t("modules.m1Desc"),
      icon: ReceiptText,
    },
    {
      name: t("modules.m2Title"),
      description: t("modules.m2Desc"),
      icon: Users,
    },
    {
      name: t("modules.m3Title"),
      description: t("modules.m3Desc"),
      icon: FileText,
    },
    {
      name: t("modules.m4Title"),
      description: t("modules.m4Desc"),
      icon: Bot,
    },
    {
      name: t("modules.m5Title"),
      description: t("modules.m5Desc"),
      icon: BarChart3,
    },
    {
      name: t("modules.m6Title"),
      description: t("modules.m6Desc"),
      icon: LockKeyhole,
    },
  ];

  const stack = ["Next.js 15", "Supabase", "Drizzle ORM", "Claude API", "shadcn/ui", "Stripe", "Resend", "Clerk", "Vercel"];

  const benefits = [
    t("benefits.b1"),
    t("benefits.b2"),
    t("benefits.b3"),
    t("benefits.b4"),
  ];

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-white shadow-glow">
            <BriefcaseBusiness size={21} />
          </span>
          <span>
            <span className="block font-display text-2xl font-semibold tracking-tight text-navy">Officia</span>
            <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">AI office OS</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <a href="#modules" className="transition hover:text-indigoElectric">{t("nav.modules")}</a>
          <Link href="/dashboard" className="transition hover:text-indigoElectric">{t("nav.dashboard")}</Link>
          <Link href="/pricing" className="transition hover:text-indigoElectric">{t("nav.pricing")}</Link>
          <a href="#stack" className="transition hover:text-indigoElectric">{t("nav.stack")}</a>
          <a href="#waitlist" className="transition hover:text-indigoElectric">{t("nav.waitlist")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/sign-in" className="hidden rounded-full border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:border-indigo-300 md:inline-flex">
            {t("nav.signIn")}
          </Link>
          <a href="#waitlist" className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-indigoElectric">
            {t("nav.joinWaitlist")}
          </a>
        </div>
      </header>

      <section id="top" className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-28 lg:pt-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 shadow-sm backdrop-blur">
            <Sparkles size={15} /> {t("hero.badge")}
          </div>
          <h1 className="mt-7 max-w-4xl font-display text-5xl font-semibold tracking-tight text-navy sm:text-6xl lg:text-7xl">
            {t("hero.title")} <span className="text-indigoElectric">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#waitlist" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigoElectric px-6 py-4 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-navy">
              {t("hero.ctaWaitlist")} <ArrowRight size={17} />
            </a>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/75 px-6 py-4 text-sm font-bold text-navy shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-300">
              {t("hero.ctaDashboard")}
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {benefits.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="text-indigoElectric" size={18} /> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="rounded-[1.5rem] bg-navy p-5 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t("dashboardPreview.label")}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{t("dashboardPreview.title")}</h2>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">{t("dashboardPreview.badge")}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  [t("dashboardPreview.stat1Label"), "128"],
                  [t("dashboardPreview.stat2Label"), "342"],
                  [t("dashboardPreview.stat3Label"), "24"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs text-slate-300">{label}</p>
                    <p className="mt-2 text-3xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-white p-4 text-slate-950">
                <div className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Bot size={18} className="text-indigoElectric" /> {t("dashboardPreview.aiTitle")}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("dashboardPreview.aiQuote")}
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  t("dashboardPreview.task1"),
                  t("dashboardPreview.task2"),
                  t("dashboardPreview.task3"),
                ].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3 text-sm">
                    <span>{item}</span>
                    <ArrowRight size={15} className="text-indigo-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigoElectric">{t("modules.label")}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-navy">{t("modules.title")}</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {t("modules.subtitle")}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, description, icon: Icon }) => (
            <article key={name} className="group rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric transition group-hover:bg-indigoElectric group-hover:text-white">
                <Icon size={22} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-navy">{name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="stack" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-xl shadow-slate-900/5 backdrop-blur lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigoElectric">{t("stack.label")}</p>
              <h2 className="mt-3 font-display text-4xl font-semibold text-navy">{t("stack.title")}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {t("stack.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {stack.map((item) => (
                <span key={item} className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="waitlist" className="mx-auto max-w-4xl px-6 py-20 lg:px-8">
        <div className="rounded-[2rem] bg-navy p-8 text-white shadow-glow lg:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Mail size={24} />
            </div>
            <h2 className="mt-5 font-display text-4xl font-semibold">{t("waitlistSection.title")}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {t("waitlistSection.subtitle")}
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>{t("footer.copy")}</p>
        <p>{t("footer.tagline")}</p>
      </footer>
    </main>
  );
}
