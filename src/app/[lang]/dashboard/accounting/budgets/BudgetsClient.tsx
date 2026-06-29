"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PieChart,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface JournalEntry {
  id: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  debitAmount: number;
  creditAmount: number;
}

interface BudgetLine {
  id: string;
  account: string;
  label: string;
  planned: number;
  type: "expense" | "revenue";
}

const ACCOUNT_OPTIONS = [
  { value: "601", label: "601 - Razkh. materiali", type: "expense" as const },
  { value: "602", label: "602 - Razkh. uslugi", type: "expense" as const },
  { value: "603", label: "603 - Amortizatsii", type: "expense" as const },
  { value: "604", label: "604 - Razkh. zaplati", type: "expense" as const },
  { value: "609", label: "609 - Drugi razkh.", type: "expense" as const },
  { value: "701", label: "701 - Prikodi prodajbi", type: "revenue" as const },
  { value: "702", label: "702 - Prikodi uslugi", type: "revenue" as const },
  { value: "709", label: "709 - Drugi prikodi", type: "revenue" as const },
];

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonth(key: string): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: parseInt(y ?? "2025"), month: parseInt(m ?? "1") };
}

function monthLabel(key: string) {
  const { year, month } = parseMonth(key);
  const names = [
    "Januari", "Februari", "Mart", "April", "Mai", "Yuni",
    "Yuli", "Avgust", "Septemvri", "Oktomvri", "Noemvri", "Dekemvri",
  ];
  return `${names[month - 1]} ${year}`;
}

function prevMonth(key: string) {
  const { year, month } = parseMonth(key);
  return month === 1
    ? getMonthKey(year - 1, 12)
    : getMonthKey(year, month - 1);
}

function nextMonth(key: string) {
  const { year, month } = parseMonth(key);
  return month === 12
    ? getMonthKey(year + 1, 1)
    : getMonthKey(year, month + 1);
}

function computeActuals(
  entries: JournalEntry[],
  monthKey: string
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of entries) {
    if (!e.date.startsWith(monthKey)) continue;
    if (e.debitAccount) {
      result[e.debitAccount] = (result[e.debitAccount] ?? 0) + e.debitAmount;
    }
    if (e.creditAccount) {
      result[e.creditAccount] =
        (result[e.creditAccount] ?? 0) + e.creditAmount;
    }
  }
  return result;
}

function pct(actual: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.round((actual / planned) * 100);
}

export default function BudgetsClient({
  lang,
  journalEntries,
}: {
  lang: string;
  journalEntries: JournalEntry[];
}) {
  const today = new Date();
  const [monthKey, setMonthKey] = useState(
    getMonthKey(today.getFullYear(), today.getMonth() + 1)
  );
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [newAccount, setNewAccount] = useState(ACCOUNT_OPTIONS[0]?.value ?? "");
  const [newPlanned, setNewPlanned] = useState("");
  const [loaded, setLoaded] = useState(false);

  const storageKey = `officia_budget_${monthKey}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLines(JSON.parse(raw));
      else setLines([]);
    } catch {
      setLines([]);
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {}
  }, [lines, storageKey, loaded]);

  const addLine = useCallback(() => {
    const amt = parseFloat(newPlanned);
    if (!newAccount || isNaN(amt) || amt <= 0) return;
    const opt = ACCOUNT_OPTIONS.find((o) => o.value === newAccount);
    if (!opt) return;
    if (lines.some((l) => l.account === newAccount)) return;
    setLines((prev) => [
      ...prev,
      {
        id: `${newAccount}-${Date.now()}`,
        account: opt.value,
        label: opt.label,
        planned: amt,
        type: opt.type,
      },
    ]);
    setNewPlanned("");
  }, [newAccount, newPlanned, lines]);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const actuals = computeActuals(journalEntries, monthKey);

  const expenseLines = lines.filter((l) => l.type === "expense");
  const revenueLines = lines.filter((l) => l.type === "revenue");

  const totalPlannedExp = expenseLines.reduce((s, l) => s + l.planned, 0);
  const totalActualExp = expenseLines.reduce(
    (s, l) => s + (actuals[l.account] ?? 0),
    0
  );
  const totalPlannedRev = revenueLines.reduce((s, l) => s + l.planned, 0);
  const totalActualRev = revenueLines.reduce(
    (s, l) => s + (actuals[l.account] ?? 0),
    0
  );

  const usedAccounts = new Set(lines.map((l) => l.account));
  const availableOptions = ACCOUNT_OPTIONS.filter(
    (o) => !usedAccounts.has(o.value)
  );

  function statusColor(p: number, type: "expense" | "revenue") {
    if (type === "expense") {
      if (p > 100) return "text-red-400";
      if (p >= 80) return "text-amber-400";
      return "text-emerald-400";
    } else {
      if (p >= 100) return "text-emerald-400";
      if (p >= 60) return "text-amber-400";
      return "text-red-400";
    }
  }

  function barColor(p: number, type: "expense" | "revenue") {
    if (type === "expense") {
      if (p > 100) return "bg-red-500";
      if (p >= 80) return "bg-amber-500";
      return "bg-emerald-500";
    } else {
      if (p >= 100) return "bg-emerald-500";
      if (p >= 60) return "bg-amber-500";
      return "bg-red-500";
    }
  }

  function StatusIcon({ p, type }: { p: number; type: "expense" | "revenue" }) {
    if (type === "expense") {
      if (p > 100)
        return <AlertTriangle size={13} className="text-red-400 shrink-0" />;
      if (p >= 80)
        return <TrendingUp size={13} className="text-amber-400 shrink-0" />;
      return <CheckCircle size={13} className="text-emerald-400 shrink-0" />;
    } else {
      if (p >= 100)
        return <CheckCircle size={13} className="text-emerald-400 shrink-0" />;
      return <TrendingDown size={13} className="text-amber-400 shrink-0" />;
    }
  }

  const BudgetSection = ({
    title,
    sectionLines,
    totalPlanned,
    totalActual,
    type,
    accentColor,
    borderColor,
    bgColor,
  }: {
    title: string;
    sectionLines: BudgetLine[];
    totalPlanned: number;
    totalActual: number;
    type: "expense" | "revenue";
    accentColor: string;
    borderColor: string;
    bgColor: string;
  }) => (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      <div className={`px-5 py-4 border-b border-white/8 flex items-center justify-between`}>
        <h2 className={`font-semibold text-sm flex items-center gap-2 ${accentColor}`}>
          {type === "expense" ? (
            <TrendingDown size={14} />
          ) : (
            <TrendingUp size={14} />
          )}
          {title}
        </h2>
        {sectionLines.length > 0 && (
          <div className="text-xs text-zinc-500">
            {totalActual.toFixed(2)} / {totalPlanned.toFixed(2)} EUR
          </div>
        )}
      </div>

      {sectionLines.length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-8">
          Niama byudzhetni redove. Dobavi po-dolu.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {sectionLines.map((line) => {
            const actual = actuals[line.account] ?? 0;
            const p = pct(actual, line.planned);
            const barW = Math.min(100, p);
            return (
              <div key={line.id} className="px-5 py-3 hover:bg-white/3 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <StatusIcon p={p} type={type} />
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-zinc-300">{line.account}</span>
                      <span className="text-xs text-zinc-500 ml-2 truncate">{line.label.split(" - ")[1]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`text-sm font-mono font-bold tabular-nums ${statusColor(p, type)}`}>
                        {p}%
                      </span>
                    </div>
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 rounded-full h-1.5 overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(p, type)}`}
                    style={{ width: `${barW}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-zinc-600 tabular-nums">
                  <span>Faktichesko: {actual.toFixed(2)} EUR</span>
                  <span>Plan: {line.planned.toFixed(2)} EUR</span>
                </div>
              </div>
            );
          })}

          <div className={`flex items-center justify-between px-5 py-3 ${bgColor} font-semibold`}>
            <span className="text-xs text-zinc-400">Obshto</span>
            <div className="flex items-center gap-4 text-xs tabular-nums">
              <span className="text-zinc-400">
                Fakt: <span className={accentColor}>{totalActual.toFixed(2)}</span>
              </span>
              <span className="text-zinc-400">
                Plan: <span className="text-white">{totalPlanned.toFixed(2)}</span>
              </span>
              <span className={`font-bold ${statusColor(pct(totalActual, totalPlanned), type)}`}>
                {pct(totalActual, totalPlanned)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/${lang}/dashboard/accounting`}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <PieChart size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Byudzhet</h1>
              <p className="text-zinc-400 text-sm">Plan vs. Faktichesko</p>
            </div>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setMonthKey(prevMonth(monthKey))}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-lg font-bold min-w-44 text-center">
            {monthLabel(monthKey)}
          </div>
          <button
            onClick={() => setMonthKey(nextMonth(monthKey))}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Summary cards */}
        {lines.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Plan prikhodi",
                value: totalPlannedRev,
                actual: totalActualRev,
                color: "text-emerald-400",
                border: "border-emerald-500/20",
                bg: "bg-emerald-950/30",
              },
              {
                label: "Plan razkh.",
                value: totalPlannedExp,
                actual: totalActualExp,
                color: "text-red-400",
                border: "border-red-500/20",
                bg: "bg-red-950/30",
              },
              {
                label: "Net (plan)",
                value: totalPlannedRev - totalPlannedExp,
                actual: totalActualRev - totalActualExp,
                color:
                  totalPlannedRev - totalPlannedExp >= 0
                    ? "text-emerald-400"
                    : "text-red-400",
                border:
                  totalPlannedRev - totalPlannedExp >= 0
                    ? "border-emerald-500/20"
                    : "border-red-500/20",
                bg:
                  totalPlannedRev - totalPlannedExp >= 0
                    ? "bg-emerald-950/30"
                    : "bg-red-950/30",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} border ${s.border} rounded-2xl p-5`}
              >
                <div className="text-xs text-zinc-400 mb-2">{s.label}</div>
                <div className={`text-xl font-bold tabular-nums ${s.color}`}>
                  {s.value >= 0 ? "" : ""}{s.value.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Fakt: {s.actual.toFixed(2)} EUR
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add budget line */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Plus size={14} className="text-violet-400" /> Dobavi byudzhetna liniya
          </h2>
          <div className="flex gap-2 flex-wrap">
            <select
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              className="flex-1 min-w-48 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {availableOptions.length === 0 ? (
                <option>Vsichki smetki sa dobaveni</option>
              ) : (
                availableOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
            <input
              type="number"
              placeholder="Planirana suma EUR"
              value={newPlanned}
              onChange={(e) => setNewPlanned(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLine()}
              className="w-48 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600"
            />
            <button
              onClick={addLine}
              disabled={availableOptions.length === 0}
              className="flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <Plus size={13} /> Dobavi
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Byudzhetite se sahranyavat lokalno v brauzara za vseki mesec.
          </p>
        </div>

        {/* Revenue section */}
        <BudgetSection
          title="Prikhodi (7xx)"
          sectionLines={revenueLines}
          totalPlanned={totalPlannedRev}
          totalActual={totalActualRev}
          type="revenue"
          accentColor="text-emerald-400"
          borderColor="border-emerald-500/20"
          bgColor="bg-emerald-950/20"
        />

        {/* Expense section */}
        <BudgetSection
          title="Razkhodi (6xx)"
          sectionLines={expenseLines}
          totalPlanned={totalPlannedExp}
          totalActual={totalActualExp}
          type="expense"
          accentColor="text-red-400"
          borderColor="border-red-500/20"
          bgColor="bg-red-950/20"
        />

        {lines.length === 0 && (
          <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-12 text-center">
            <PieChart size={48} className="text-violet-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Nyama byudzhetni linii</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Izberi smetka i planiranata suma za {monthLabel(monthKey)}.
              Sistemata shte sravni s realnite zhurnal zapisi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
