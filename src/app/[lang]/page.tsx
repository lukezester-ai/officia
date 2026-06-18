import Link from 'next/link';
import { ArrowRight, CheckCircle, FileText, Brain, Building2, BarChart3, Shield, Zap, Users } from 'lucide-react';

const features = [
  { icon: BarChart3, title: 'Счетоводство', desc: 'Сметкоплан, журнални записи, ДДС дневници, баланс и отчет за П/З.', color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30', iconCls: 'text-indigo-600' },
  { icon: FileText, title: 'Фактуриране', desc: 'Продажбени и покупни фактури с автоматично ДДС осчетоводяване.', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconCls: 'text-emerald-600' },
  { icon: Brain, title: 'AI Документи', desc: 'Качи PDF или снимка — Claude AI извлича текста и ти позволява да чатиш с документа.', color: 'from-violet-500 to-fuchsia-600', bg: 'bg-violet-50 dark:bg-violet-950/30', iconCls: 'text-violet-600' },
  { icon: Building2, title: 'Банкиране', desc: 'Автоматична синхронизация чрез PSD2 и AI съпоставяне на транзакции.', color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-950/30', iconCls: 'text-blue-600' },
  { icon: Users, title: 'HR & Кадри', desc: 'Управление на служители, договори и заплати на едно място.', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/30', iconCls: 'text-amber-600' },
  { icon: BarChart3, title: 'Dashboard', desc: 'Красиви KPI-та и графики — виж бизнеса си с един поглед.', color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50 dark:bg-rose-950/30', iconCls: 'text-rose-600' },
];

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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-lg z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center font-bold text-lg">O</div>
            <span className="font-bold text-xl tracking-tight">Officia</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Функции</a>
            <a href="#pricing" className="hover:text-white transition-colors">Цени</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/${lang}/sign-in`} className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2">Вход</Link>
            <Link href={`/${lang}/sign-up`} className="text-sm bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-2 rounded-lg font-medium">Започни безплатно</Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-950 to-zinc-950" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm px-4 py-1.5 rounded-full mb-8 font-medium">
            <Zap size={14} /> Ново в България — AI + Счетоводство
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight">
            Интелигентният офис<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              за твоя бизнес
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Автоматизирай счетоводството, фактурите и документите с изкуствен интелект.
            Специално създаден за малки и средни фирми в България.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${lang}/sign-up`} className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25">
              Започни безплатно <ArrowRight size={18} />
            </Link>
            <Link href={`/${lang}/dashboard`} className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all px-8 py-4 rounded-xl font-semibold text-lg">
              Виж демо
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mt-6">Без кредитна карта · 14 дни пълен достъп</p>
        </div>
      </section>

      <section className="py-16 border-y border-white/5 bg-white/2">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-zinc-500 mb-8 uppercase tracking-widest font-medium">Включва всичко за съвременния бизнес</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: '100%', l: 'Съответствие ЗДДС' },
              { n: 'AI', l: 'Анализ на документи' },
              { n: 'PSD2', l: 'Банкова синхронизация' },
              { n: '∞', l: 'Фактури и записи' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent mb-1">{s.n}</div>
                <div className="text-sm text-zinc-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Всичко на едно място</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Officia замества 5 различни програми — счетоводство, фактуриране, HR, банкиране и документи.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all hover:bg-white/5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Прост, честен ценови план</h2>
          <p className="text-zinc-400 mb-12">Без скрити такси. Без изненади.</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/3 border border-white/10 rounded-2xl p-8 text-left">
              <div className="text-sm text-zinc-400 font-medium mb-2 uppercase tracking-wider">Стартер</div>
              <div className="text-4xl font-bold mb-1">Безплатно</div>
              <div className="text-zinc-500 text-sm mb-6">14 дни · без кредитна карта</div>
              <div className="space-y-3 text-sm text-zinc-400 mb-8">
                {['До 50 фактури/месец', 'Базово счетоводство', '1 потребител', 'Email поддръжка'].map(i => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" />{i}</div>
                ))}
              </div>
              <Link href={`/${lang}/sign-up`} className="block text-center border border-white/15 hover:border-white/30 rounded-xl py-3 text-sm font-medium transition-all hover:bg-white/5">
                Започни безплатно
              </Link>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 border border-indigo-500/30 rounded-2xl p-8 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full">Популярен</div>
              <div className="text-sm text-indigo-200 font-medium mb-2 uppercase tracking-wider">Про</div>
              <div className="text-4xl font-bold mb-1">49 лв.<span className="text-lg font-normal text-indigo-200">/мес</span></div>
              <div className="text-indigo-200 text-sm mb-6">Пълен достъп до всички функции</div>
              <div className="space-y-3 text-sm text-indigo-100 mb-8">
                {['Неограничени фактури', 'AI анализ на документи', 'Банкова синхронизация', 'До 10 потребители', 'Приоритетна поддръжка'].map(i => (
                  <div key={i} className="flex items-center gap-2"><CheckCircle size={14} className="text-white" />{i}</div>
                ))}
              </div>
              <Link href={`/${lang}/sign-up`} className="block text-center bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl py-3 text-sm font-semibold transition-all">
                Започни пробния период
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Готов да автоматизираш офиса си?</h2>
          <p className="text-zinc-400 mb-8">Присъедини се към фирмите, които вече работят по-умно с Officia.</p>
          <Link href={`/${lang}/sign-up`} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all px-10 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/25">
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