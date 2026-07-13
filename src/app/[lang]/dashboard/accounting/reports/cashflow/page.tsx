import Link from "next/link";
import { Waves, ArrowLeft, TrendingUp, TrendingDown, Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { ExportButtons } from "@/components/accounting/ExportButtons";
import { requireTenant } from "@/lib/auth/get-tenant";
import { db } from "@/lib/db/db";
import { journalLines, journalHeaders } from "@/lib/db/schema/journal_entries";
import { accountPlan } from "@/lib/db/schema/account_plan";
import { eq, and, gte, lte, sql, like, or } from "drizzle-orm";

function fmt(n: number) {
  return Math.abs(n).toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function getCashFlowData(tenantId: string, start: Date, end: Date) {
  // Query all journal lines touching cash accounts (501 Каса, 503 Разплащателна сметка)
  const rows = await db
    .select({
      accountCode: accountPlan.accountNumber,
      accountName: accountPlan.name,
      entryType: journalLines.entryType,
      total: sql<number>`SUM(${journalLines.amount})`,
      entryDate: journalHeaders.entryDate,
    })
    .from(journalLines)
    .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
    .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
    .where(
      and(
        eq(journalHeaders.tenantId, tenantId),
        gte(journalHeaders.entryDate, start),
        lte(journalHeaders.entryDate, end),
        or(
          like(accountPlan.accountNumber, "501%"),
          like(accountPlan.accountNumber, "503%"),
        )
      )
    )
    .groupBy(accountPlan.accountNumber, accountPlan.name, journalLines.entryType, journalHeaders.entryDate);

  // Opening balance – movements BEFORE start on cash accounts
  const openingRows = await db
    .select({
      total: sql<number>`SUM(CASE WHEN ${journalLines.entryType}::text = 'debit' THEN ${journalLines.amount} ELSE -${journalLines.amount} END)`,
    })
    .from(journalLines)
    .innerJoin(journalHeaders, eq(journalLines.journalId, journalHeaders.id))
    .innerJoin(accountPlan, eq(journalLines.accountId, accountPlan.id))
    .where(
      and(
        eq(journalHeaders.tenantId, tenantId),
        lte(journalHeaders.entryDate, start),
        or(
          like(accountPlan.accountNumber, "501%"),
          like(accountPlan.accountNumber, "503%"),
        )
      )
    );

  const openingBalance = Number(openingRows[0]?.total || 0);

  // Aggregate inflows (debits) and outflows (credits) per account
  const accountMap: Record<string, { name: string; inflow: number; outflow: number }> = {};
  rows.forEach((r: any) => {
    const key = r.accountCode;
    if (!accountMap[key]) accountMap[key] = { name: r.accountName, inflow: 0, outflow: 0 };
    const amt = Math.abs(Number(r.total));
    if (r.entryType === "debit") accountMap[key].inflow += amt;
    else accountMap[key].outflow += amt;
  });

  const accounts = Object.entries(accountMap).map(([code, v]) => ({ code, ...v, net: v.inflow - v.outflow }));
  const totalInflow  = accounts.reduce((s, a) => s + a.inflow, 0);
  const totalOutflow = accounts.reduce((s, a) => s + a.outflow, 0);
  const netChange    = totalInflow - totalOutflow;
  const closingBalance = openingBalance + netChange;

  return { accounts, totalInflow, totalOutflow, netChange, openingBalance, closingBalance };
}

export default async function CashFlowPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  let tenantId: string;
  try {
    const tenant = await requireTenant();
    tenantId = tenant.tenantId;
  } catch (e: any) {
    return <div className="min-h-screen bg-zinc-950 p-8 text-rose-400">⚠️ {e?.message || 'Не сте влезли в системата.'}</div>;
  }

  const year  = new Date().getFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end   = new Date();

  const data = await getCashFlowData(tenantId, start, end);

  const ACCOUNT_NAMES: Record<string, string> = {
    "501": "Каса", "503": "Разплащателна сметка",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
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
              <p className="text-zinc-400 text-sm">{start.toLocaleDateString("bg-BG")} – {end.toLocaleDateString("bg-BG")}</p>
            </div>
          </div>
          <div className="ml-auto">
            <ExportButtons data={data} reportType="cashflow" period={`${start.toLocaleDateString("bg-BG")} - ${end.toLocaleDateString("bg-BG")}`} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Начално салдо",   value: data.openingBalance, color: "text-zinc-300",   bg: "bg-white/5 border-white/10",             icon: Wallet },
            { label: "Парични приходи", value: data.totalInflow,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: ArrowDownToLine },
            { label: "Парични разходи", value: data.totalOutflow,   color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",       icon: ArrowUpFromLine },
            { label: "Крайно салдо",    value: data.closingBalance, color: data.closingBalance >= 0 ? "text-violet-400" : "text-rose-400", bg: data.closingBalance >= 0 ? "bg-violet-500/10 border-violet-500/20" : "bg-rose-500/10 border-rose-500/20", icon: Wallet },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border ${k.bg} p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <k.icon size={14} className={k.color} />
                <span className="text-xs text-zinc-400">{k.label}</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${k.color}`}>{fmt(k.value)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
            </div>
          ))}
        </div>

        {/* Net change banner */}
        <div className={`rounded-2xl border p-6 flex items-center justify-between ${data.netChange >= 0 ? "bg-emerald-950/20 border-emerald-500/20" : "bg-rose-950/20 border-rose-500/20"}`}>
          <div>
            <div className="font-bold text-lg">{data.netChange >= 0 ? "Нетен приток" : "Нетен отток"}</div>
            <div className="text-zinc-400 text-sm">Парични приходи − Парични разходи</div>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${data.netChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {data.netChange >= 0 ? "+" : "−"}{fmt(data.netChange)} EUR
          </div>
        </div>

        {/* Account breakdown */}
        {data.accounts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5">
            {/* Inflows */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
                <ArrowDownToLine size={14} className="text-emerald-400" />
                <h2 className="font-semibold text-sm">Парични приходи (дебити)</h2>
              </div>
              {data.accounts.map((a: any) => a.inflow > 0 && (
                <div key={`in-${a.code}`} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-xs font-mono text-zinc-300">{a.code}</div>
                    <span className="text-xs text-zinc-500">{ACCOUNT_NAMES[a.code.slice(0, 3)] ?? a.name}</span>
                  </div>
                  <span className="text-sm font-mono tabular-nums text-emerald-400">+{fmt(a.inflow)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-emerald-500/5 font-semibold">
                <span className="text-xs text-emerald-400">Общо приходи</span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">+{fmt(data.totalInflow)}</span>
              </div>
            </div>

            {/* Outflows */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
                <ArrowUpFromLine size={14} className="text-rose-400" />
                <h2 className="font-semibold text-sm">Парични разходи (кредити)</h2>
              </div>
              {data.accounts.map((a: any) => a.outflow > 0 && (
                <div key={`out-${a.code}`} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-xs font-mono text-zinc-300">{a.code}</div>
                    <span className="text-xs text-zinc-500">{ACCOUNT_NAMES[a.code.slice(0, 3)] ?? a.name}</span>
                  </div>
                  <span className="text-sm font-mono tabular-nums text-rose-400">−{fmt(a.outflow)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-rose-500/5 font-semibold">
                <span className="text-xs text-rose-400">Общо разходи</span>
                <span className="text-sm font-bold text-rose-400 tabular-nums">−{fmt(data.totalOutflow)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
            <Waves size={40} className="text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Няма парични движения по сметки 501/503 за избрания период.</p>
          </div>
        )}
      </div>
    </div>
  );
}
