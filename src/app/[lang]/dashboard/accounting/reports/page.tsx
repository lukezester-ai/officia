// @ts-nocheck
import Link from "next/link";
import { BarChart3, TrendingUp, Scale, Waves, ArrowRight, FileText } from "lucide-react";

export default async function ReportsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  const reports = [
    {
      href: `/${lang}/dashboard/accounting/reports/pl`,
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/25",
      title: "Prikhodi i Razkhodi",
      subtitle: "P&L Report",
      desc: "Net result, revenues vs expenses breakdown",
    },
    {
      href: `/${lang}/dashboard/accounting/reports/balance`,
      icon: Scale,
      color: "from-blue-500 to-cyan-600",
      shadow: "shadow-blue-500/25",
      title: "Balans",
      subtitle: "Balance Sheet",
      desc: "Assets = Liabilities + Equity",
    },
    {
      href: `/${lang}/dashboard/accounting/reports/cashflow`,
      icon: Waves,
      color: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/25",
      title: "Pari i Potok",
      subtitle: "Cash Flow Statement",
      desc: "Operating, investing, financing activities",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Finansovi otcheti</h1>
            <p className="text-zinc-400 text-sm">P&L · Balans · Cash Flow</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reports.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-5 shadow-lg ${r.shadow} group-hover:scale-105 transition-transform`}>
                <r.icon size={22} className="text-white" />
              </div>
              <h2 className="font-bold text-lg mb-0.5">{r.title}</h2>
              <p className="text-xs text-zinc-500 mb-3">{r.subtitle}</p>
              <p className="text-sm text-zinc-400 mb-5 leading-relaxed">{r.desc}</p>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 group-hover:text-white transition-colors">
                Otvori otcheta <ArrowRight size={13} />
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={15} className="text-zinc-400" />
            <h3 className="font-semibold text-sm">Kak rabotat otchetite</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
            <div>
              <div className="font-medium text-white mb-1">P&L</div>
              Izchislява se ot scheti 6xx (Razkhodi) i 7xx (Prikhodi). Razlikata = Net rezultat.
            </div>
            <div>
              <div className="font-medium text-white mb-1">Balans</div>
              Aktivi (1xx-5xx) vs Pasivi i Kapital (1xx, 4xx). Triabva da se ravniavat.
            </div>
            <div>
              <div className="font-medium text-white mb-1">Cash Flow</div>
              Dvijenie po smetki 501 i 503 (Kasa + Banka) v izbran period.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
