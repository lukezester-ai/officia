import { db } from "@/lib/db/db";
import { journalEntries } from "@/lib/db/schema";
import Link from "next/link";
import { TrendingUp, ArrowLeft, TrendingDown, Minus } from "lucide-react";

const NAMES: Record<string, string> = {
  "701": "Prikhodi prodajbi", "702": "Prikhodi uslugi", "709": "Drugi prikhodi",
  "601": "Razkhodi materiali", "602": "Razkhodi uslugi", "603": "Amortizatsii",
  "604": "Razkhodi zaplati", "609": "Drugi razkhodi",
};

export default async function PLReport({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  let entries: any[] = [];
  try { entries = await db.select().from(journalEntries as any).limit(1000); } catch {}

  const revenue: Record<string, number> = {};
  const expenses: Record<string, number> = {};

  for (const e of entries) {
    const ca = e.creditAccount ?? e.credit_account;
    const da = e.debitAccount ?? e.debit_account;
    const camt = Number(e.creditAmount ?? e.credit_amount ?? 0);
    const damt = Number(e.debitAmount ?? e.debit_amount ?? 0);
    if (ca?.startsWith("7")) revenue[ca] = (revenue[ca] ?? 0) + camt;
    if (da?.startsWith("6")) expenses[da] = (expenses[da] ?? 0) + damt;
  }

  const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);
  const net = totalRevenue - totalExpenses;

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
              <h1 className="text-2xl font-bold">Prikhodi i Razkhodi</h1>
              <p className="text-zinc-400 text-sm">P&L Report</p>
            </div>
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
              <span className="text-xs text-zinc-400">Net rezultat</span>
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
              <h2 className="font-semibold text-sm">Prikhodi (7xx)</h2>
            </div>
            {Object.keys(revenue).length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-8">Niama prikhodi</p>
            ) : (
              <div className="divide-y divide-white/5">
                {Object.entries(revenue).sort().map(([acc, amt]) => (
                  <div key={acc} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-xs font-mono text-zinc-300">{acc}</div>
                      <div className="text-xs text-zinc-500">{NAMES[acc] ?? "Prihod"}</div>
                    </div>
                    <div className="text-sm font-mono text-emerald-400 tabular-nums">{amt.toFixed(2)}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-emerald-950/20">
                  <span className="text-xs font-semibold text-zinc-300">Obshto</span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">{totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
              <TrendingDown size={14} className="text-red-400" />
              <h2 className="font-semibold text-sm">Razkhodi (6xx)</h2>
            </div>
            {Object.keys(expenses).length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-8">Niama razkhodi</p>
            ) : (
              <div className="divide-y divide-white/5">
                {Object.entries(expenses).sort().map(([acc, amt]) => (
                  <div key={acc} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-xs font-mono text-zinc-300">{acc}</div>
                      <div className="text-xs text-zinc-500">{NAMES[acc] ?? "Razkhod"}</div>
                    </div>
                    <div className="text-sm font-mono text-red-400 tabular-nums">{amt.toFixed(2)}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-red-950/20">
                  <span className="text-xs font-semibold text-zinc-300">Obshto</span>
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
