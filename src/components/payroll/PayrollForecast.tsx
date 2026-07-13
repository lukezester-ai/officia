"use client";

import { TrendingUp, AlertTriangle, CircleAlert } from "lucide-react";


const BG_MONTHS = ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];

// Employer social security rates (Bulgaria 2024)
const EMPLOYER_RATE = 0.2132; // ДОО 13.72% + ДЗПО 2.8% + ЗЗО 4.8% + ТЗПБ 0.5% + ОЗМ 0.1% + ОЗТ 0.2%

function fmt(n: number) {
  return n.toLocaleString("bg-BG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface PayrollForecastProps {
  monthlyGross: number;
  employeeCount: number;
}

export function PayrollForecast({ monthlyGross, employeeCount }: PayrollForecastProps) {
  const now = new Date();
  const currentMonth = now.getMonth();

  // Project 6 months forward with 0% growth (conservative)
  const months = Array.from({ length: 6 }, (_, i) => {
    const monthIdx = (currentMonth + i) % 12;
    const gross = monthlyGross * (1 + i * 0.005); // 0.5% slight drift per month
    const employerContribs = gross * EMPLOYER_RATE;
    const totalCost = gross + employerContribs;
    const net = gross * (1 - 0.1592); // approx net after employee deductions
    return {
      label: BG_MONTHS[monthIdx],
      gross: Math.round(gross),
      employerContribs: Math.round(employerContribs),
      totalCost: Math.round(totalCost),
      net: Math.round(net),
      isCurrent: i === 0,
    };
  });

  const maxCost = Math.max(...months.map((m) => m.totalCost));
  const totalSixMonths = months.reduce((s, m) => s + m.totalCost, 0);
  const annualProjection = monthlyGross * 12 * (1 + EMPLOYER_RATE);

  if (monthlyGross === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-violet-400" />
          <h2 className="text-lg font-semibold text-white">Прогноза ФРЗ — следващи 6 месеца</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <CircleAlert size={12} />

          <span>Включва работодателски осигуровки ({(EMPLOYER_RATE * 100).toFixed(1)}%)</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
            <div className="text-xs text-violet-400 uppercase tracking-wider mb-1">Месечен разход (общо)</div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {fmt(months[0].totalCost)} €
            </div>
            <div className="text-xs text-zinc-500 mt-1">бруто + осигуровки работодател</div>
          </div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">6-месечен разход</div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {fmt(totalSixMonths)} €
            </div>
            <div className="text-xs text-zinc-500 mt-1">прогнозен паричен поток</div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Годишна прогноза</div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {fmt(annualProjection)} €
            </div>
            <div className="text-xs text-zinc-500 mt-1">{employeeCount} служител{employeeCount !== 1 ? "и" : ""}</div>
          </div>
        </div>

        {/* Bar Chart */}
        <div>
          <div className="flex items-end justify-between gap-2 h-36">
            {months.map((m) => {
              const heightPct = maxCost > 0 ? (m.totalCost / maxCost) * 100 : 0;
              const netHeightPct = maxCost > 0 ? (m.net / maxCost) * 100 : 0;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {fmt(m.totalCost)} €
                  </div>
                  <div className="relative w-full flex flex-col justify-end h-28 rounded-t-md overflow-hidden">
                    {/* Total cost bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        m.isCurrent
                          ? "bg-gradient-to-t from-violet-600 to-violet-400"
                          : "bg-gradient-to-t from-violet-900/60 to-violet-700/40"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    {/* Net overlay */}
                    <div
                      className="absolute bottom-0 w-full bg-emerald-500/20 border-t border-emerald-500/30"
                      style={{ height: `${netHeightPct}%` }}
                    />
                  </div>
                  <div className={`text-xs font-medium ${m.isCurrent ? "text-violet-400" : "text-zinc-500"}`}>
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 justify-end">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <div className="w-3 h-3 rounded-sm bg-violet-600" />
              Общ разход работодател
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/30" />
              Нето към служители
            </div>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Разбивка на текущия месец</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-zinc-500 text-xs">Бруто заплати</div>
              <div className="text-white font-semibold tabular-nums">{fmt(months[0].gross)} €</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs">Осигуровки (работодател)</div>
              <div className="text-amber-400 font-semibold tabular-nums">{fmt(months[0].employerContribs)} €</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs">Нето (към служители)</div>
              <div className="text-emerald-400 font-semibold tabular-nums">{fmt(months[0].net)} €</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs">Реален разход на фирмата</div>
              <div className="text-violet-400 font-bold tabular-nums text-base">{fmt(months[0].totalCost)} €</div>
            </div>
          </div>
        </div>

        {/* Warning if significant cost */}
        {months[0].totalCost > 5000 && (
          <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Месечният ФРЗ разход надвишава 5,000 €. Препоръчваме да планирате паричния поток поне 60 дни напред.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
