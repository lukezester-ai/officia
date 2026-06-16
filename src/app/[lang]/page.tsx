'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, BarChart3, Bot, FileText, Shield, Users, Landmark, Zap, CheckCircle } from 'lucide-react';

const features = [
  { icon: FileText, title: 'Счетоводство', desc: 'Фактури, журнал, главна книга и финансови отчети — всичко автоматизирано.', light: 'bg-indigo-50 text-indigo-600' },
  { icon: Users, title: 'HR & Заплати', desc: 'Управление на служители, договори, отпуски и изплащане на заплати.', light: 'bg-violet-50 text-violet-600' },
  { icon: Landmark, title: 'Банкиране', desc: 'Следене на банкови сметки, транзакции и автоматично reconciliation.', light: 'bg-blue-50 text-blue-600' },
  { icon: Bot, title: 'AI Асистент', desc: 'Задавай въпроси за финансите си на естествен език и получавай отговори.', light: 'bg-emerald-50 text-emerald-600' },
  { icon: BarChart3, title: 'Аналитика', desc: 'Визуални отчети и dashboard с ключови показатели в реално време.', light: 'bg-amber-50 text-amber-600' },
  { icon: Shield, title: 'Сигурност', desc: 'Пълно криптиране, роли и права за достъп за всеки член на екипа.', light: 'bg-rose-50 text-rose-600' },
];

const stats = [
  { value: '500+', label: 'Компании' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Поддръжка' },
  { value: '3x', label: 'По-бързо' },
];

export default function LandingPage() {
  const params = useParams();
  const lang = params?.lang || 'bg';

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">
            <span className="text-primary">O</span>fficia
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/${lang}/dashboard`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Вход</Link>
            <Link href={`/${lang}/dashboard`} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity">
              Започни безплатно <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-8">
            <Zap size={14} /> Ново: AI асистент за счетоводство
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Officia <span className="text-primary">интелигентният офис</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Счетоводство, HR и документи събрани на едно място. Спести време и усилия всеки ден.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/${lang}/dashboard`} className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 text-base">
              Влез в таблото <ArrowRight size={16} />
            </Link>
            <Link href={`/${lang}/dashboard`} className="h-12 px-8 rounded-xl border border-border font-semibold flex items-center gap-2 hover:bg-accent transition-colors text-base">
              Виж демо
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-y bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-extrabold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Всичко необходимо за бизнеса ти</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Шест модула, напълно интегрирани, за да работиш по-ефективно.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card border rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.light}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Готов ли си да започнеш?</h2>
          <p className="opacity-80 text-lg mb-8">Регистрирай се безплатно и виж как Officia трансформира работата ти.</p>
          <Link href={`/${lang}/dashboard`} className="h-12 px-8 rounded-xl bg-white text-primary font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
            Започни безплатно <ArrowRight size={16} />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8 opacity-70 text-sm flex-wrap">
            {['Без кредитна карта', 'Безплатен план', '5 минути setup'].map((t) => (
              <div key={t} className="flex items-center gap-1.5"><CheckCircle size={14} /> {t}</div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground"><span className="text-primary">O</span>fficia</div>
          <div>© 2026 Officia. Всички права запазени.</div>
        </div>
      </footer>
    </div>
  );
}