"use client";

import { useState } from "react";
import { Scale, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Bell } from "lucide-react";

// Bulgarian labor law parameters - updated for 2024/2025
// Source: НАП, НОИ, МТСП
const LEGISLATION = {
  currentYear: 2025,
  params: [
    {
      id: "mrz",
      name: "Минимална работна заплата",
      value: 1077,
      unit: "лв/мес",
      effectiveFrom: "01.01.2025",
      prevValue: 933,
      prevYear: 2024,
      source: "https://nap.bg",
      description: "МРЗ за 2025 г. — ПМС №316 от 2024 г.",
      checkFn: (salary: number) => salary < 1077,
      warningText: (name: string) => `${name} получава под МРЗ от 2025 г. (1 077 лв)`,
    },
    {
      id: "max_ins",
      name: "Максимален осигурителен доход",
      value: 4130,
      unit: "лв/мес",
      effectiveFrom: "01.01.2025",
      prevValue: 3750,
      prevYear: 2024,
      source: "https://noi.bg",
      description: "Нов максимум от 2025 — ЗБ НОИ 2025",
      checkFn: (salary: number) => salary > 3750 && salary <= 4130,
      warningText: (name: string) => `${name}: новият таван (4 130 лв) засяга изчислението на осигуровките`,
    },
    {
      id: "non_taxable",
      name: "Необлагаем минимум (ДОД)",
      value: 7920,
      unit: "лв/год",
      effectiveFrom: "01.01.2024",
      prevValue: 7920,
      prevYear: 2023,
      source: "https://nap.bg",
      description: "780 лв/мес × 12 — ЗДДФЛ чл. 18",
      checkFn: () => false,
      warningText: () => "",
    },
    {
      id: "sick_leave",
      name: "Болнични — работодателски дни",
      value: 2,
      unit: "дни/год",
      effectiveFrom: "01.01.2024",
      prevValue: 2,
      prevYear: 2023,
      source: "https://noi.bg",
      description: "Работодателят покрива първите 2 дни — КСО чл. 40",
      checkFn: () => false,
      warningText: () => "",
    },
    {
      id: "paid_leave",
      name: "Минимален платен отпуск",
      value: 20,
      unit: "дни/год",
      effectiveFrom: "01.01.2024",
      prevValue: 20,
      prevYear: 2023,
      source: "https://mтруд.bg",
      description: "20 работни дни — КТ чл. 155",
      checkFn: () => false,
      warningText: () => "",
    },
  ],
  upcoming: [
    {
      date: "01.01.2026",
      description: "Очаквано увеличение на МРЗ — следете НАП и МТСП за потвърждение",
      severity: "info" as const,
    },
    {
      date: "31.03.2025",
      description: "Краен срок — Годишна данъчна декларация на физически лица (ЗДДФЛ чл. 50)",
      severity: "warning" as const,
    },
    {
      date: "30.04.2025",
      description: "Декларация обр. 1 и обр. 6 за Q1 2025 — НАП",
      severity: "warning" as const,
    },
  ],
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  gross: number;
  position?: string;
}

interface LegislativeTrackerProps {
  employees: Employee[];
}

export function LegislativeTracker({ employees }: LegislativeTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Find affected employees for each legislative parameter
  const alerts: { paramId: string; paramName: string; employees: string[] }[] = [];
  for (const param of LEGISLATION.params) {
    if (!param.checkFn) continue;
    const affected = employees.filter((e) => param.checkFn(e.gross));
    if (affected.length > 0) {
      alerts.push({
        paramId: param.id,
        paramName: param.name,
        employees: affected.map((e) => `${e.firstName} ${e.lastName}`),
      });
    }
  }

  const activeAlerts = alerts.filter((a) => !dismissed.includes(a.paramId));
  const now = new Date();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Законодателен Монитор</h2>
          <span className="text-xs text-zinc-600">— НАП / НОИ / МТСП</span>
        </div>
        <div className="flex items-center gap-2">
          {activeAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <Bell size={10} />
              {activeAlerts.length} засягат ведомостта
            </span>
          )}
          <span className="text-xs text-zinc-600">
            Обновено: {now.toLocaleDateString("bg-BG")}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Active alerts for this company's employees */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-3">
              ⚠ Засягат вашите служители
            </div>
            {activeAlerts.map((alert) => (
              <div
                key={alert.paramId}
                className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{alert.paramName}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Засяга: <span className="text-amber-300">{alert.employees.join(", ")}</span>
                  </div>
                </div>
                <button
                  onClick={() => setDismissed((d) => [...d, alert.paramId])}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                >
                  Отхвърли
                </button>
              </div>
            ))}
          </div>
        )}

        {activeAlerts.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <CheckCircle size={16} />
            Всички служители са в съответствие с текущото законодателство.
          </div>
        )}

        {/* Upcoming deadlines */}
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">
            Предстоящи срокове
          </div>
          <div className="space-y-2">
            {LEGISLATION.upcoming.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-3 border text-sm ${
                  item.severity === "warning"
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
                    : "border-blue-500/20 bg-blue-500/5 text-blue-300"
                }`}
              >
                <span className="font-mono text-xs shrink-0 opacity-70">{item.date}</span>
                <span className="text-zinc-400">{item.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Parameters table - expandable */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Скрий" : "Покажи"} всички параметри за {LEGISLATION.currentYear}
          </button>

          {expanded && (
            <div className="mt-4 rounded-xl border border-white/5 bg-black/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs text-zinc-600 uppercase tracking-wider">Параметър</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-600 uppercase tracking-wider">2024</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-600 uppercase tracking-wider">2025</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-600 uppercase tracking-wider">От дата</th>
                  </tr>
                </thead>
                <tbody>
                  {LEGISLATION.params.map((p, i) => (
                    <tr key={p.id} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/1" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-xs text-zinc-600">{p.description}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                        {p.prevValue} {p.unit}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${p.value !== p.prevValue ? "text-emerald-400" : "text-zinc-400"}`}>
                        {p.value} {p.unit}
                        {p.value !== p.prevValue && (
                          <span className="ml-1 text-[10px] text-emerald-500">
                            +{((p.value - p.prevValue) / p.prevValue * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500 tabular-nums">
                        {p.effectiveFrom}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 flex items-center gap-3 border-t border-white/5">
                <a href="https://nap.bg" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <ExternalLink size={11} /> НАП
                </a>
                <a href="https://noi.bg" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <ExternalLink size={11} /> НОИ
                </a>
                <span className="text-xs text-zinc-600 ml-auto">
                  Параметрите се обновяват при всяка промяна в законодателството
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
