import { Scale, TrendingUp, FileText, DollarSign, Download, ArrowRight, BarChart3, Calendar } from "lucide-react";
import Link from "next/link";

const reports = [
  { title: "Баланс", desc: "Активи, пасиви и собствен капитал към избрана дата.", grad: "from-indigo-500 to-violet-600", border: "border-indigo-500/20", bg: "from-indigo-500/8 to-violet-500/8", Icon: Scale, href: "reports/balance" },
  { title: "Приходи и разходи", desc: "Отчет Печалба/Загуба за избран период.", grad: "from-emerald-500 to-teal-600", border: "border-emerald-500/20", bg: "from-emerald-500/8 to-teal-500/8", Icon: TrendingUp, href: "reports/profit-loss" },
  { title: "ДДС Справка", desc: "Дневник покупки и продажби за избран период.", grad: "from-amber-500 to-orange-600", border: "border-amber-500/20", bg: "from-amber-500/8 to-orange-500/8", Icon: FileText, href: "vat-journals" },
  { title: "Cash Flow", desc: "Паричен поток — постъпления и плащания.", grad: "from-blue-500 to-cyan-600", border: "border-blue-500/20", bg: "from-blue-500/8 to-cyan-500/8", Icon: DollarSign, href: "banking" },
  { title: "Амортизации", desc: "Дълготрайни активи и начислени амортизации.", grad: "from-rose-500 to-pink-600", border: "border-rose-500/20", bg: "from-rose-500/8 to-pink-500/8", Icon: BarChart3, href: "fixed-assets" },
  { title: "Главна книга", desc: "Всички журнални записи с обороти по сметки.", grad: "from-violet-500 to-fuchsia-600", border: "border-violet-500/20", bg: "from-violet-500/8 to-fuchsia-500/8", Icon: Calendar, href: "journal-entries" },
];

export default async function ReportsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Отчети</h1>
            <p className="text-zinc-400 text-sm">Финансови справки и анализи</p>
          </div>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-400">Период:</span>
            {["Текущ месец", "Предходен месец", "Q1 2026", "Q2 2026", "2025", "2026"].map(p => (
              <button key={p} className="text-xs px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all text-zinc-300">{p}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map(r => (
            <Link key={r.title} href={`/${lang}/dashboard/${r.href}`} className={`bg-gradient-to-br ${r.bg} border ${r.border} rounded-2xl p-6 hover:scale-[1.01] transition-all group`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${r.grad} flex items-center justify-center shadow-lg`}>
                  <r.Icon size={20} className="text-white" />
                </div>
                <ArrowRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition-all" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{r.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{r.desc}</p>
              <div className="mt-4 flex items-center gap-2">
                <Download size={13} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">Excel / PDF</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
            <Download size={22} className="text-white" />
          </div>
          <h3 className="font-semibold text-xl mb-2">Експорт към Excel или PDF</h3>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">Изтегли всички финансови данни за избран период.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all px-6 py-3 rounded-xl font-medium text-sm shadow-lg shadow-violet-500/20">
              <Download size={15} /> Изтегли Excel
            </button>
            <button className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 px-6 py-3 rounded-xl font-medium text-sm">
              <FileText size={15} /> Изтегли PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
