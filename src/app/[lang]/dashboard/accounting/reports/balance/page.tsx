import { db } from "@/lib/db/db";
import { journalEntries } from "@/lib/db/schema";
import Link from "next/link";
import { Scale, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const NAMES: Record<string, string> = {
  "101": "Osnoven kapital", "151": "Dalgosrochni zaemi",
  "201": "Zemya i sgradi", "204": "Mashini", "241": "Amortizatsiya DMA",
  "301": "Materiali", "304": "Stoki",
  "401": "Dostavchitsi", "411": "Klienti",
  "4531": "DDS pokupki", "4532": "DDS prodajbi",
  "501": "Kasa", "503": "Razplashtatelna smetka",
  "601": "Razkhodi mat.", "603": "Amortizatsii", "701": "Prikhodi prodajbi",
};

function classify(acc: string): "asset" | "liability" | "equity" | "other" {
  if (!acc) return "other";
  const n = parseInt(acc);
  if (n >= 100 && n < 200) return "equity";
  if (n >= 200 && n < 400) return "asset";
  if (n >= 400 && n < 500) {
    if (acc.startsWith("41") || acc.startsWith("4531")) return "asset";
    return "liability";
  }
  if (n >= 500 && n < 600) return "asset";
  return "other";
}

export default async function BalanceReport({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  let entries: any[] = [];
  try { entries = await db.select().from(journalEntries as any).limit(2000); } catch {}

  const bal: Record<string, number> = {};
  for (const e of entries) {
    const da = e.debitAccount ?? e.debit_account;
    const ca = e.creditAccount ?? e.credit_account;
    const damt = Number(e.debitAmount ?? e.debit_amount ?? 0);
    const camt = Number(e.creditAmount ?? e.credit_amount ?? 0);
    if (da) bal[da] = (bal[da] ?? 0) + damt;
    if (ca) bal[ca] = (bal[ca] ?? 0) - camt;
  }

  const assets: [string, number][] = [];
  const liabilities: [string, number][] = [];
  const equity: [string, number][] = [];

  for (const [acc, v] of Object.entries(bal)) {
    const cls = classify(acc);
    if (cls === "asset") assets.push([acc, Math.abs(v)]);
    else if (cls === "liability") liabilities.push([acc, Math.abs(v)]);
    else if (cls === "equity") equity.push([acc, Math.abs(v)]);
  }

  const totalA = assets.reduce((s, [, v]) => s + v, 0);
  const totalL = liabilities.reduce((s, [, v]) => s + v, 0);
  const totalE = equity.reduce((s, [, v]) => s + v, 0);
  const balanced = Math.abs(totalA - (totalL + totalE)) < 1;

  const Section = ({ title, color, rows, total, totalColor, bg }: any) => (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8">
        <h2 className={`font-semibold text-sm ${color}`}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-6">Empty</p>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([acc, val]: [string, number]) => (
            <div key={acc} className="flex items-center justify-between px-5 py-3">
              <div>
                <span className="text-xs font-mono text-zinc-400">{acc}</span>
                <span className="text-xs text-zinc-500 ml-2">{NAMES[acc] ?? "Smetka"}</span>
              </div>
              <span className={`text-sm font-mono tabular-nums ${totalColor}`}>{val.toFixed(2)}</span>
            </div>
          ))}
          <div className={`flex items-center justify-between px-5 py-3 ${bg} font-semibold`}>
            <span className="text-xs">Obshto</span>
            <span className={`text-sm font-bold tabular-nums ${totalColor}`}>{total.toFixed(2)}</span>
          </div>
        </div>
      )}
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Scale size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Balans</h1>
              <p className="text-zinc-400 text-sm">Balance Sheet</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {balanced
              ? <><CheckCircle size={16} className="text-emerald-400" /><span className="text-xs text-emerald-400">Balansirano</span></>
              : <><AlertCircle size={16} className="text-amber-400" /><span className="text-xs text-amber-400">Nebalansirano</span></>
            }
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aktivi", value: totalA, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-950/30" },
            { label: "Pasivi", value: totalL, color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-950/30" },
            { label: "Kapital", value: totalE, color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-950/30" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="text-xs text-zinc-400 mb-2">{s.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value.toFixed(2)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">EUR</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Section title="AKTIVI" color="text-blue-400" rows={assets} total={totalA} totalColor="text-blue-400" bg="bg-blue-950/20" />
          <div className="space-y-4">
            <Section title="PASIVI" color="text-orange-400" rows={liabilities} total={totalL} totalColor="text-orange-400" bg="bg-orange-950/20" />
            <Section title="KAPITAL" color="text-violet-400" rows={equity} total={totalE} totalColor="text-violet-400" bg="bg-violet-950/20" />
          </div>
        </div>

        <div className={`border rounded-2xl p-5 flex items-center justify-between ${balanced ? "bg-emerald-950/20 border-emerald-500/20" : "bg-amber-950/20 border-amber-500/20"}`}>
          <span className="font-semibold">Aktivi = Pasivi + Kapital</span>
          <div className="text-right font-mono text-sm">
            <div className="text-blue-400">{totalA.toFixed(2)}</div>
            <div className={balanced ? "text-emerald-400" : "text-amber-400"}>= {(totalL + totalE).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
