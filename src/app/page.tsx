import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, Users, Zap, Shield, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-lg z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-xl">O</span>
            </div>
            <span className="font-semibold text-2xl tracking-tight">Officia</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="hover:text-blue-400 transition">Функции</a>
            <a href="#demo" className="hover:text-blue-400 transition">Демо</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Цени</a>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Вход</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Започни безплатно</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 text-blue-400 border-blue-500/30">
            Ново в България • AI + Счетоводство
          </Badge>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-6">
            Интелигентният офис<br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              за твоя бизнес
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Автоматизирай счетоводството, фактурите и документите с изкуствен интелект. 
            Специално създаден за малки и средни фирми в България.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-10" asChild>
              <Link href="/register">
                Започни безплатно <ArrowRight className="ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10" asChild>
              <Link href="#demo">Виж демо</Link>
            </Button>
          </div>

          <p className="text-sm text-zinc-500 mt-6">Без кредитна карта • 14 дни пълен достъп</p>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="border-y border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-zinc-400">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" /> <span>GDPR Ready</span>
          </div>
          <div>Clerk Auth</div>
          <div>Anthropic Claude</div>
          <div>Next.js 15</div>
          <div>Българско ДДС</div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Всичко, от което се нуждаеш в един продукт</h2>
            <p className="text-zinc-400">Мощни инструменти + AI, които работят заедно</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart3 className="w-10 h-10 text-blue-500" />,
                title: "Интелигентно Счетоводство",
                desc: "Сметкоплан, ДДС дневници, баланс, Печалба/Загуба и автоматична амортизация."
              },
              {
                icon: <Zap className="w-10 h-10 text-violet-500" />,
                title: "AI Анализ на Документи",
                desc: "Качвай фактури и договори — Claude Vision ги чете и разбира."
              },
              {
                icon: <Users className="w-10 h-10 text-emerald-500" />,
                title: "Фактуриране & Контрагенти",
                desc: "Професионални фактури + пълно управление на клиенти и доставчици."
              },
              {
                icon: <Shield className="w-10 h-10 text-amber-500" />,
                title: "Банкови Транзакции",
                desc: "Автоматична синхронизация + AI съпоставяне на разходи."
              },
              {
                icon: <CheckCircle className="w-10 h-10 text-rose-500" />,
                title: "HR & Документи",
                desc: "Управление на служители и централен архив на документи."
              },
              {
                icon: <BarChart3 className="w-10 h-10 text-sky-500" />,
                title: "Красив Dashboard",
                desc: "Реално време KPI-та, графики и финансови отчети."
              },
            ].map((feature, i) => (
              <div key={i} className="bg-zinc-950 border border-white/10 rounded-3xl p-8 hover:border-white/30 transition group">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-zinc-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Готов ли си да автоматизираш офиса си?</h2>
          <p className="text-2xl text-zinc-400 mb-10">Присъедини се към бъдещето на българския бизнес.</p>
          
          <Button size="lg" className="text-xl px-12 py-8 rounded-2xl" asChild>
            <Link href="/register">
              Създай безплатен акаунт сега
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 text-zinc-500">
        <div className="max-w-6xl mx-auto text-center">
          <p>© 2026 Officia. Създадено с ❤️ за българския бизнес.</p>
        </div>
      </footer>
    </div>
  );
}
