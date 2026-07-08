import { ReportEngine } from "@/lib/accounting/report-engine";
import Link from "next/link";
import { Waves, ArrowLeft, TrendingUp, TrendingDown, ArrowUpDown, DollarSign } from "lucide-react";
import { requireTenant } from "@/lib/auth/get-tenant";
import { ExportButtons } from "@/components/accounting/ExportButtons";

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, useGrouping: true });
}

export default async function CashFlowPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ period?: string }> }) {
  const { lang } = await params;
  const sp = await searchParams;
  const { tenantId } = await requireTenant();
  if (!tenantId) return <div className="p-8 text-white">No tenant configured for this user.</div>;

  const now = new Date();
  const endDate = now;
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const report = await ReportEngine.generateCashFlowDetailed(tenantId, startDate, endDate);

  const isPositive = report.netCashFlow >= 0;
  const isOpPositive = report.operating.total >= 0;

  const Row = ({ label, value, indent }: { label: string; value: number; indent?: boolean }) => {
    const isValPositive = value >= 0;
    return (
      <div className={`flex items-center justify-between px-5 py-2.5 ${indent ? 'ml-6' : ''}`}>
        <span className="text-xs text-zinc-400">{label}</span>
        <span className={`text-sm font-mono tabular-nums ${isValPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isValPositive ? '+' : ''}{fmt(value)}
        </span>
      </div>
    );
  };

  const SectionBlock = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/3 border border-white/8 rounded-2xl overflow-hidden ${className || ''}`}>{children}</div>
  );

  const SectionHeader = ({ icon, title, total, color, positive }: { icon: React.ReactNode; title: string; total: number; color: string; positive: boolean }) => (
    <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>{icon}</div>
        <h2 className="font-semibold text-sm text-white">{title}</h2>
      </div>
      <span className={`text-sm font-bold tabular-nums ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? '+' : ''}{fmt(total)}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/${lang}/dashboard/accounting/reports`} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Waves size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Паричен Поток</h1>
              <p className="text-zinc-400 text-sm">Cash Flow Statement</p>
            </div>
          </div>
          <div className="ml-auto">
            <ExportButtons data={report} reportType="pnl" period={`${startDate.toLocaleDateString('bg-BG')} - ${endDate.toLocaleDateString('bg-BG')}`} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Нетна печалба", value: report.netProfit, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-950/30" },
            { label: "Оперативен поток", value: report.operating.total, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-950/30" },
            { label: "Инвестиционен поток", value: report.investing.total, color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-950/30" },
            { label: "Финансов поток", value: report.financing.total, color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-950/30" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="text-xs text-zinc-400 mb-2">{s.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{fmt(s.value)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionBlock className="lg:col-span-3">
            <SectionHeader
              icon={<TrendingUp size={16} className="text-emerald-400" />}
              title="Оперативна дейност"
              total={report.operating.total}
              color="from-emerald-600 to-emerald-700"
              positive={isOpPositive}
            />
            <div className="divide-y divide-white/5">
              <Row label="Нетна печалба/загуба" value={report.netProfit} />
              <Row label="Корекция: Амортизация" value={report.depreciation} indent />
              <div className="border-t border-white/5 py-2">
                <div className="px-5 py-1">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Промени в оборотния капитал</span>
                </div>
                <Row label="Вземания (Клиенти)" value={report.workingCapital.receivables.change} indent />
                <Row label="Задължения (Доставчици)" value={report.workingCapital.payables.change} indent />
                <Row label="ДДС покупки" value={report.workingCapital.vatPurchases.change} indent />
                <Row label="ДДС продажби" value={report.workingCapital.vatSales.change} indent />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock>
            <SectionHeader
              icon={<TrendingDown size={16} className="text-orange-400" />}
              title="Инвестиционна дейност"
              total={report.investing.total}
              color="from-orange-600 to-orange-700"
              positive={report.investing.total >= 0}
            />
            <Row label="ДМА (покупки/продажби)" value={report.investing.total} />
          </SectionBlock>

          <SectionBlock>
            <SectionHeader
              icon={<ArrowUpDown size={16} className="text-violet-400" />}
              title="Финансова дейност"
              total={report.financing.total}
              color="from-violet-600 to-violet-700"
              positive={report.financing.total >= 0}
            />
            <Row label="Заеми (151)" value={report.financing.loans} />
            <Row label="Капитал (101)" value={report.financing.capital} />
          </SectionBlock>

          <SectionBlock>
            <SectionHeader
              icon={<DollarSign size={16} className="text-cyan-400" />}
              title="Парични средства"
              total={report.cash.change}
              color="from-cyan-600 to-cyan-700"
              positive={report.cash.change >= 0}
            />
            <Row label="Начален баланс (501+503)" value={report.cash.start} />
            <Row label="Краен баланс (501+503)" value={report.cash.end} />
          </SectionBlock>
        </div>

        <div className={`border rounded-2xl p-5 flex items-center justify-between ${
          isPositive ? "bg-emerald-950/20 border-emerald-500/20" : "bg-red-950/20 border-red-500/20"
        }`}>
          <span className="font-semibold">Нетен паричен поток</span>
          <div className="flex items-center gap-3">
            {isPositive ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-red-400" />}
            <span className={`text-xl font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{fmt(report.netCashFlow)} EUR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}