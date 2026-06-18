"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Landmark,
  Upload,
  Zap,
  CheckCircle2,
  XCircle,
  Link2,
  Unlink2,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
} from "lucide-react";

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  debitAmount: number;
  creditAmount: number;
}

interface BankTx {
  id: string;
  date: string;
  description: string;
  amount: number; // positive = credit/income, negative = debit/expense
  matchedJournalId: string | null;
  reconciled: boolean;
  score: number | null;
}

function parseCSV(text: string): BankTx[] {
  const lines = text.trim().split("\n");
  const result: BankTx[] = [];
  const start = lines[0]?.toLowerCase().includes("date") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) continue;
    const amount = parseFloat(parts[2] ?? "0");
    if (isNaN(amount)) continue;
    result.push({
      id: `csv-${i}`,
      date: parts[0] ?? "",
      description: parts[1] ?? "",
      amount,
      matchedJournalId: null,
      reconciled: false,
      score: null,
    });
  }
  return result;
}

function matchScore(tx: BankTx, je: JournalEntry): number {
  const txAmt = Math.abs(tx.amount);
  const jeAmt = Math.max(je.debitAmount, je.creditAmount);
  const amtDiff = Math.abs(txAmt - jeAmt);
  if (amtDiff > txAmt * 0.1 + 5) return 0;

  let score = 100 - amtDiff * 2;

  const txDate = new Date(tx.date).getTime();
  const jeDate = new Date(je.date).getTime();
  if (!isNaN(txDate) && !isNaN(jeDate)) {
    const dayDiff = Math.abs(txDate - jeDate) / 86400000;
    score -= dayDiff * 5;
  }

  const txWords = tx.description.toLowerCase().split(/\s+/);
  const jeWords = je.description.toLowerCase().split(/\s+/);
  const common = txWords.filter((w) => w.length > 3 && jeWords.includes(w)).length;
  score += common * 10;

  return Math.max(0, Math.round(score));
}

function autoMatch(txs: BankTx[], journal: JournalEntry[]): BankTx[] {
  const usedJe = new Set<string>();
  return txs.map((tx) => {
    if (tx.reconciled) return tx;
    let best: JournalEntry | null = null;
    let bestScore = 0;
    for (const je of journal) {
      if (usedJe.has(je.id)) continue;
      const s = matchScore(tx, je);
      if (s > bestScore && s > 30) {
        bestScore = s;
        best = je;
      }
    }
    if (best) {
      usedJe.add(best.id);
      return { ...tx, matchedJournalId: best.id, score: bestScore };
    }
    return { ...tx, matchedJournalId: null, score: null };
  });
}

export default function ReconciliationClient({
  lang,
  journalEntries,
}: {
  lang: string;
  journalEntries: JournalEntry[];
}) {
  const [bankTxs, setBankTxs] = useState<BankTx[]>([]);
  const [csvError, setCsvError] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualAmt, setManualAmt] = useState("");
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [selectedJe, setSelectedJe] = useState<string | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) { setCsvError("No valid rows found. Format: Date,Description,Amount"); return; }
        setCsvError("");
        setBankTxs((prev) => [...prev, ...parsed]);
      } catch {
        setCsvError("Could not parse CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const addManual = () => {
    const amt = parseFloat(manualAmt);
    if (!manualDate || !manualDesc || isNaN(amt)) return;
    setBankTxs((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, date: manualDate, description: manualDesc, amount: amt, matchedJournalId: null, reconciled: false, score: null },
    ]);
    setManualDate(""); setManualDesc(""); setManualAmt("");
  };

  const runAutoMatch = () => setBankTxs((prev) => autoMatch(prev, journalEntries));

  const linkSelected = () => {
    if (!selectedTx || !selectedJe) return;
    setBankTxs((prev) =>
      prev.map((tx) => tx.id === selectedTx ? { ...tx, matchedJournalId: selectedJe, score: 100 } : tx)
    );
    setSelectedTx(null); setSelectedJe(null);
  };

  const toggleReconcile = (txId: string) => {
    setBankTxs((prev) =>
      prev.map((tx) => tx.id === txId ? { ...tx, reconciled: !tx.reconciled } : tx)
    );
  };

  const removeTx = (txId: string) => setBankTxs((prev) => prev.filter((t) => t.id !== txId));

  const unlinkTx = (txId: string) =>
    setBankTxs((prev) => prev.map((tx) => tx.id === txId ? { ...tx, matchedJournalId: null, score: null } : tx));

  const reconciledCount = bankTxs.filter((t) => t.reconciled).length;
  const matchedCount = bankTxs.filter((t) => t.matchedJournalId).length;

  const matchedJeIds = new Set(bankTxs.map((t) => t.matchedJournalId).filter(Boolean));

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/${lang}/dashboard/accounting`} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Landmark size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bankova Ravsmetka</h1>
              <p className="text-zinc-400 text-sm">Bank Reconciliation - auto-matching</p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {bankTxs.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Vneseni", value: bankTxs.length, color: "text-white" },
              { label: "Svarzani", value: matchedCount, color: "text-indigo-400" },
              { label: "Ravneni", value: reconciledCount, color: "text-emerald-400" },
              { label: "Ochkvasht", value: bankTxs.length - reconciledCount, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center">
                <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Import + actions */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Upload size={14} className="text-indigo-400" /> Vnesi izvlechenie
            </h2>
            {bankTxs.length > 0 && (
              <button
                onClick={runAutoMatch}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                <Zap size={12} /> Auto-Match
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="cursor-pointer flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-colors">
              <FileText size={13} className="text-indigo-400" />
              CSV upload (Date, Desc, Amount)
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {csvError && <p className="text-red-400 text-xs">{csvError}</p>}

          <div className="flex gap-2 flex-wrap">
            <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
            <input placeholder="Opisanie" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)}
              className="flex-1 min-w-32 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600" />
            <input placeholder="Suma (- = izkhod)" type="number" value={manualAmt} onChange={(e) => setManualAmt(e.target.value)}
              className="w-32 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600" />
            <button onClick={addManual}
              className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={13} /> Dobavi
            </button>
          </div>

          {selectedTx && selectedJe && (
            <div className="flex items-center gap-3 p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-xs">
              <AlertCircle size={14} className="text-indigo-400 shrink-0" />
              <span className="text-indigo-300">Izbrani: bank tx + zhurnal zapis. Svarzhete gi:</span>
              <button onClick={linkSelected} className="ml-auto flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-lg transition-colors font-medium">
                <Link2 size={12} /> Svarzhi
              </button>
              <button onClick={() => { setSelectedTx(null); setSelectedJe(null); }}
                className="text-zinc-500 hover:text-white transition-colors"><XCircle size={14} /></button>
            </div>
          )}
        </div>

        {/* Main reconciliation grid */}
        {bankTxs.length > 0 ? (
          <div className="grid grid-cols-2 gap-5">
            {/* Bank transactions */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
                <Landmark size={14} className="text-indigo-400" />
                <h2 className="font-semibold text-sm">Bankovi tranzaktsii</h2>
                <span className="ml-auto text-xs text-zinc-500">{bankTxs.length} broya</span>
              </div>
              <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
                {bankTxs.map((tx) => {
                  const je = tx.matchedJournalId ? journalEntries.find((j) => j.id === tx.matchedJournalId) : null;
                  const isSelected = selectedTx === tx.id;
                  return (
                    <div
                      key={tx.id}
                      onClick={() => !tx.reconciled && setSelectedTx(isSelected ? null : tx.id)}
                      className={`px-5 py-3 transition-colors cursor-pointer ${tx.reconciled ? "opacity-50" : ""} ${isSelected ? "bg-indigo-950/40" : "hover:bg-white/3"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-zinc-500 font-mono">{tx.date}</span>
                            {je && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${(tx.score ?? 0) >= 80 ? "bg-emerald-950/60 text-emerald-400" : (tx.score ?? 0) >= 50 ? "bg-amber-950/60 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}>
                               {tx.score}%
                              </span>
                            )}
                            {tx.reconciled && <CheckCircle2 size={12} className="text-emerald-400" />}
                          </div>
                          <div className="text-xs text-zinc-300 truncate">{tx.description}</div>
                          {je && <div className="text-xs text-indigo-400 mt-0.5 truncate">Svarzano: {je.description || `${je.debitAccount} / ${je.creditAccount}`}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-mono font-bold tabular-nums ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            {tx.matchedJournalId && (
                              <button onClick={(e) => { e.stopPropagation(); unlinkTx(tx.id); }}
                                className="text-zinc-600 hover:text-red-400 transition-colors" title="Razsvarzhi">
                                <Unlink2 size={11} />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); toggleReconcile(tx.id); }}
                              className={`transition-colors ${tx.reconciled ? "text-emerald-400" : "text-zinc-600 hover:text-emerald-400"}`}
                              title={tx.reconciled ? "Otmeni" : "Ravni"}>
                              <CheckCircle2 size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); removeTx(tx.id); }}
                              className="text-zinc-600 hover:text-red-400 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Journal entries */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
                <FileText size={14} className="text-zinc-400" />
                <h2 className="font-semibold text-sm">Zhurnal zapisi</h2>
                <span className="ml-auto text-xs text-zinc-500">{journalEntries.length} broya</span>
              </div>
              <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
                {journalEntries.length === 0 && (
                  <p className="text-zinc-600 text-xs text-center py-8">Niama zhurnal zapisi</p>
                )}
                {journalEntries.map((je) => {
                  const isMatched = matchedJeIds.has(je.id);
                  const isSelected = selectedJe === je.id;
                  return (
                    <div
                      key={je.id}
                      onClick={() => !isMatched && setSelectedJe(isSelected ? null : je.id)}
                      className={`px-5 py-3 transition-colors cursor-pointer ${isMatched ? "opacity-40" : ""} ${isSelected ? "bg-indigo-950/40" : "hover:bg-white/3"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-zinc-500 font-mono">{je.date}</span>
                            {isMatched && <Link2 size={11} className="text-indigo-400" />}
                          </div>
                          <div className="text-xs text-zinc-300 truncate">{je.description || "(bez opisanie)"}</div>
                          <div className="text-xs text-zinc-600 mt-0.5 font-mono">{je.debitAccount} / {je.creditAccount}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono font-bold tabular-nums text-zinc-300">
                            {Math.max(je.debitAmount, je.creditAmount).toFixed(2)}
                          </div>
                          <div className="text-xs text-zinc-600">lv.</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-12 text-center">
            <Landmark size={48} className="text-indigo-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Vnesi bankovoto izvlechenie</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-4">
              Kachni CSV fail (Date, Description, Amount) ili dobavi tranzaktsii rachao.
              Sistemata shte svarzhe avtomatichno s zhurnal zapisi po suma i data.
            </p>
            <p className="text-zinc-600 text-xs font-mono">2024-01-15,Plashtane klient,5000.00</p>
            <p className="text-zinc-600 text-xs font-mono">2024-01-16,Naem ofis,-1500.00</p>
          </div>
        )}
      </div>
    </div>
  );
}
