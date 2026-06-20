// @ts-nocheck
import { ReportEngine } from "@/lib/accounting/report-engine";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { TrendingUp, ArrowLeft, TrendingDown, Minus } from "lucide-react";
import { ExportButtons } from "@/components/accounting/ExportButtons";

const NAMES: Record<string, string> = {
  "701": "Приходи продажби", "702": "Приходи услуги", "709": "Други приходи",
  "601": "Разходи материали", "602": "Разходи услуги", "603": "Амортизации",
  "604": "Разходи заплати", "609": "Други разходи",
};

import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

export default async function PLReport({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { userId } = await auth();

  if (!userId) return <div className="p-8 text-white">Unauthenticated</div>;

  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  const tenantId = user?.tenantId;

  if (!tenantId) return <div className="p-8 text-white">No tenant configured for this user.</div>;

  const start = new Date(new Date().getFullYear(), 0, 1);
  const end = new Date();
  const report = await ReportEngine.generatePnL(tenantId, start, end);

  const revenue: Record<string, number> = {};
  report.revenue.breakdown.forEach((b: any) => {
    revenue[b.accountCode || "Unknown"] = Math.abs(Number(b.amount) || 0);
  });

  const expenses: Record<string, number> = {};
  report.expenses.breakdown.forEach((b: any) => {
    expenses[b.accountCode || "Unknown"] = Math.abs(Number(b.amount) || 0);
  });

  const totalRevenue = report.revenue.total;
  const totalExpenses = report.expenses.total;
  const net = report.netProfit;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/${lang}/dashboard/accounting/reports`} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Приходи и Разходи</h1>
              <p className="text-zinc-400 text-sm">P&L Report</p>
            </div>
          </div>
          <div className="ml-auto">
            <ExportButtons data={report} reportType="pnl" period={`${start.toLocaleDateString('bg-BG')} - ${end.toLocaleDateString('bg-BG')}`} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-xs text-zinc-400">Obshto prikhodi</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">{totalRevenue.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
          </div>
          <div className="bg-red-950/40 border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-red-400" />
              <span className="text-xs text-zinc-400">Obshto razkhodi</span>
            </div>
            <div className="text-2xl font-bold text-red-400 tabular-nums">{totalExpenses.toFixed(2)}</div>
            <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
          </div>
          <div className={`${net >= 0 ? "bg-emerald-950/40 border-emerald-500/20" : "bg-red-950/40 border-red-500/20"} border rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-2">
              <Minus size={14} className={net >= 0 ? "text-emerald-400" : "text-red-400"} />
              <span className="text-zinc-400 text-sm font-medium">Нетен Финансов Резултат</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {net >= 0 ? "+" : ""}{net.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <h2 className="font-semibold text-sm">Приходи (7xx)</h2>
            </div>
            {report.revenue.breakdown.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-8">Няма приходи</p>
            ) : (
              <div className="divide-y divide-white/5">
                {report.revenue.breakdown.map((b: any) => (
                  <div key={b.accountCode} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-xs font-mono text-zinc-300">{b.accountCode}</div>
                      <span className="text-xs text-zinc-500 ml-2">{NAMES[b.accountCode] ?? "Сметка"}</span>
                    </div>
                    <span className="text-sm font-mono tabular-nums text-emerald-400">
                      {Number(b.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-emerald-500/5 font-semibold">
                  <span className="text-xs text-emerald-400">Общо Приходи</span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">{totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
              <TrendingDown size={14} className="text-red-400" />
              <h2 className="font-semibold text-sm">Разходи (6xx)</h2>
            </div>
            {report.expenses.breakdown.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-8">Няма разходи</p>
            ) : (
              <div className="divide-y divide-white/5">
                {report.expenses.breakdown.map((b: any) => (
                  <div key={b.accountCode} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-xs font-mono text-zinc-300">{b.accountCode}</div>
                      <span className="text-xs text-zinc-500 ml-2">{NAMES[b.accountCode] ?? "Сметка"}</span>
                    </div>
                    <span className="text-sm font-mono tabular-nums text-rose-400">
                      {Number(b.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-rose-500/5 font-semibold">
                  <span className="text-xs text-rose-400">Общо Разходи</span>
                  <span className="text-sm font-bold text-red-400 tabular-nums">{totalExpenses.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`border rounded-2xl p-6 ${net >= 0 ? "bg-emerald-950/20 border-emerald-500/20" : "bg-red-950/20 border-red-500/20"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">{net >= 0 ? "Pechalba" : "Zaguba"}</div>
              <div className="text-zinc-400 text-sm">Prikhodi - Razkhodi</div>
            </div>
            <div className={`text-3xl font-bold tabular-nums ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {net >= 0 ? "+" : ""}{net.toFixed(2)} EUR
            </div>
          </div>
          {totalRevenue > 0 && (
            <div className="mt-4 bg-white/5 rounded-xl h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, (net / totalRevenue) * 100 + 50))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
