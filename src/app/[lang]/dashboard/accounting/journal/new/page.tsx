"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Trash2, Save, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const ACCOUNTS = [
  { code: "411", name: "Клиенти" },
  { code: "401", name: "Доставчици" },
  { code: "501", name: "Каса в евро" },
  { code: "503", name: "Разплащателна сметка" },
  { code: "601", name: "Разходи за материали" },
  { code: "602", name: "Разходи за външни услуги" },
  { code: "603", name: "Амортизации" },
  { code: "701", name: "Приходи от продажби" },
  { code: "4531", name: "Начислен ДДС за покупки" },
  { code: "4532", name: "Начислен ДДС за продажби" },
  { code: "241", name: "Амортизация на ДМА" },
  { code: "304", name: "Стоки" },
  { code: "101", name: "Основен капитал" },
  { code: "151", name: "Получени дългосрочни заеми" },
];

interface Line {
  id: number;
  account: string;
  description: string;
  debit: string;
  credit: string;
}

import { use } from "react";

export default function NewJournalEntry(props: { params: Promise<{ lang: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: 1, account: "", description: "", debit: "", credit: "" },
    { id: 2, account: "", description: "", debit: "", credit: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const validLines = lines.length >= 2 && lines.every((line) => line.account && ((Number(line.debit) > 0) !== (Number(line.credit) > 0)));

  const addLine = () =>
    setLines((prev) => [...prev, { id: Date.now(), account: "", description: "", debit: "", credit: "" }]);

  const removeLine = (id: number) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const updateLine = (id: number, field: keyof Line, value: string) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const handleSave = async () => {
    setError("");
    if (!date) return setError("Изберете дата");
    if (!description) return setError("Въведете описание");
    if (!balanced) return setError("Дебит и Кредит трябва да са равни");
    if (!validLines) return setError("Всеки ред трябва да има сметка и сума само в дебит или само в кредит");

    setSaving(true);
    try {
      const res = await fetch("/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reference, description, lines }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Грешка при записване");
      setSuccess(true);
      setTimeout(() => router.push(`/${params.lang}/dashboard/accounting/journal`), 1500);
    } catch (e: any) {
      setError(e.message ?? "Грешка при запазване");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-white/25 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ново счетоводно записване</h1>
              <p className="text-zinc-400 text-sm">Двойно счетоводство</p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Дата *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Референция</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="JE-001"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 text-white placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Описание *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Продажба на стоки..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 text-white placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Счетоводни редове</h2>
            <button
              onClick={addLine}
              className="text-xs flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus size={13} /> Добави ред
            </button>
          </div>

          <div className="p-4 space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-2 pb-1">
              <div className="col-span-3 text-xs text-zinc-500">Сметка</div>
              <div className="col-span-4 text-xs text-zinc-500">Описание</div>
              <div className="col-span-2 text-xs text-zinc-500 text-right">Дебит (€)</div>
              <div className="col-span-2 text-xs text-zinc-500 text-right">Кредит (€)</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <select
                    value={line.account}
                    onChange={(e) => updateLine(line.id, "account", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-violet-500/50 text-white"
                  >
                    <option value="">-- Изберете --</option>
                    {ACCOUNTS.map((a) => (
                      <option key={a.code} value={a.code} className="bg-zinc-900">
                        {a.code} {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    placeholder="Описание..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-violet-500/50 text-white placeholder:text-zinc-600"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={line.debit}
                    onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-blue-950/30 border border-blue-500/20 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-blue-300 placeholder:text-zinc-600 text-right"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={line.credit}
                    onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-emerald-500/50 text-emerald-300 placeholder:text-zinc-600 text-right"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {lines.length > 2 && (
                    <button
                      onClick={() => removeLine(line.id)}
                      className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-white/8 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {balanced ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <AlertCircle size={16} className="text-amber-400" />
              )}
              <span className={`text-xs font-medium ${balanced ? "text-emerald-400" : "text-amber-400"}`}>
                {balanced ? "Балансирано" : "Небалансирано"}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm font-mono">
              <span className="text-blue-400">ДТ {totalDebit.toFixed(2)}</span>
              <span className="text-zinc-500">=</span>
              <span className="text-emerald-400">КТ {totalCredit.toFixed(2)}</span>
              {!balanced && Math.abs(totalDebit - totalCredit) > 0 && (
                <span className="text-amber-400 text-xs">
                  разлика: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle size={15} /> Записано успешно! Пренасочване...
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/25 transition-all text-sm"
          >
            Отказ
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !balanced || !validLines}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all px-6 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-violet-500/25"
          >
            <Save size={15} />
            {saving ? "Запазва се..." : "Запази записването"}
          </button>
        </div>

      </div>
    </div>
  );
}
