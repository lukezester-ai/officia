"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface ParsedEmployee {
  name?: string;
  position?: string;
  department?: string;
  salary?: string;
  email?: string;
}

function parseNaturalLanguage(text: string): ParsedEmployee {
  const result: ParsedEmployee = {};

  // Extract name: first two capitalized words (Bulgarian names)
  const nameMatch = text.match(/^([А-ЯA-Z][а-яa-z]+ [А-ЯA-Z][а-яa-z]+)/u);
  if (nameMatch) result.name = nameMatch[1];

  // Extract salary: number followed by лв/лева/bgn/eur or preceded by €
  const salaryMatch = text.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(?:лв|лева|bgn|eur|€)/i);
  if (salaryMatch) result.salary = salaryMatch[1].replace(/\s/g, "").replace(",", ".");

  // Extract position: common keywords
  const posKeywords = [
    "програмист", "счетоводител", "мениджър", "директор", "инженер",
    "консултант", "продавач", "асистент", "анализатор", "специалист",
    "юрист", "адвокат", "маркетолог", "дизайнер", "HR", "офис мениджър",
  ];
  for (const kw of posKeywords) {
    if (text.toLowerCase().includes(kw)) {
      result.position = kw.charAt(0).toUpperCase() + kw.slice(1);
      break;
    }
  }

  // Extract department hint
  const deptMap: Record<string, string> = {
    програмист: "ИТ Отдел",
    инженер: "ИТ Отдел",
    счетоводител: "Счетоводство",
    мениджър: "Управление",
    директор: "Управление",
    продавач: "Продажби",
    маркетолог: "Маркетинг",
    дизайнер: "Дизайн",
    HR: "Човешки Ресурси",
  };
  for (const [kw, dept] of Object.entries(deptMap)) {
    if (text.toLowerCase().includes(kw.toLowerCase())) {
      result.department = dept;
      break;
    }
  }

  return result;
}

interface AIOnboardingWidgetProps {
  onParsed: (data: ParsedEmployee) => void;
}

export function AIOnboardingWidget({ onParsed }: AIOnboardingWidgetProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedEmployee | null>(null);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    // Small delay for UX
    await new Promise((r) => setTimeout(r, 600));
    const result = parseNaturalLanguage(input);
    setParsed(result);
    setLoading(false);
  };

  const handleApply = () => {
    if (parsed) {
      onParsed(parsed);
      setParsed(null);
      setInput("");
    }
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-indigo-950/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">AI Онбординг</div>
          <div className="text-xs text-zinc-500">Опишете служителя с естествен текст</div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder='Напр: "Иван Петров, програмист, 3500 лв бруто, от 1 август"'
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all"
        />
        <button
          onClick={handleParse}
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "Анализирам..." : "Извлечи"}
        </button>
      </div>

      {parsed && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">AI извлече:</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {parsed.name && (
              <div><span className="text-zinc-500">Имена:</span> <span className="text-white font-medium">{parsed.name}</span></div>
            )}
            {parsed.position && (
              <div><span className="text-zinc-500">Позиция:</span> <span className="text-white font-medium">{parsed.position}</span></div>
            )}
            {parsed.department && (
              <div><span className="text-zinc-500">Отдел:</span> <span className="text-white font-medium">{parsed.department}</span></div>
            )}
            {parsed.salary && (
              <div><span className="text-zinc-500">Заплата:</span> <span className="text-emerald-400 font-bold">{parsed.salary} лв</span></div>
            )}
          </div>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-all"
          >
            <ArrowRight size={14} /> Попълни формата
          </button>
        </div>
      )}

      <div className="text-xs text-zinc-600">
        Примери: "Мария Георгиева, счетоводител, 2800 лв" · "Петър Димитров, мениджър продажби, 4200 лв бруто"
      </div>
    </div>
  );
}
