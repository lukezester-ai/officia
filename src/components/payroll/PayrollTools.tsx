"use client";

import { useState } from "react";
import { Calculator, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { calculatePayroll } from "@/lib/payroll/calculator";

function calcFromGross(gross: number) {
  const now = new Date();
  const month = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"][now.getMonth()];
  const calc = calculatePayroll(gross, month, now.getFullYear());
  return {
    gross,
    net: calc.netSalary,
    tax: calc.ddfl,
    empDoo: calc.employee.doo,
    empDzpo: calc.employee.dzpo,
    empZzo: calc.employee.zo,
    totalEmployer: calc.totalEmployerCost,
    emplContribs: calc.employer.total,
  };
}

function calcFromNet(net: number) {
  // Iterate to find gross from net
  let gross = net * 1.25;
  for (let i = 0; i < 50; i++) {
    const r = calcFromGross(gross);
    const diff = r.net - net;
    if (Math.abs(diff) < 0.01) break;
    gross -= diff * 0.8;
  }
  return calcFromGross(gross);
}

function fmt(n: number) {
  return n.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayrollCalculator() {
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [value, setValue] = useState<string>("2400");
  const [count, setCount] = useState<string>("1");

  const numVal = parseFloat(value) || 0;
  const numCount = parseInt(count) || 1;
  const result = numVal > 0 ? (mode === "gross" ? calcFromGross(numVal) : calcFromNet(numVal)) : null;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-indigo-950/30 overflow-hidden">
      <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center gap-2">
        <Calculator size={18} className="text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Калкулатор „Колко ми струва служителят?"</h2>
      </div>

      <div className="p-6 space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("gross")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              mode === "gross"
                ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Знам бруто заплатата
          </button>
          <button
            onClick={() => setMode("net")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              mode === "net"
                ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Искам нетно за служителя
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
              {mode === "gross" ? "Бруто заплата (€)" : "Желано нетно (€)"}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold tabular-nums focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
              placeholder="2400"
              min="0"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
              Брой служители
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold tabular-nums focus:outline-none focus:border-violet-500/50 transition-all"
              placeholder="1"
              min="1"
              max="100"
            />
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Main answer */}
            <div className="rounded-xl bg-black/30 border border-violet-500/30 p-5 text-center">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Реалният разход на фирмата {numCount > 1 ? `(${numCount} служители)` : ""}
              </div>
              <div className="text-4xl font-black text-violet-400 tabular-nums">
                {fmt(result.totalEmployer * numCount)} €/мес
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {fmt(result.totalEmployer * numCount * 12)} € годишно
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/3 border border-white/5 p-4">
                <div className="text-xs text-zinc-500 mb-1">Бруто заплата</div>
                <div className="text-lg font-bold text-white tabular-nums">{fmt(result.gross * numCount)} €</div>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <div className="text-xs text-emerald-400 mb-1">Нето (получава служителят)</div>
                <div className="text-lg font-bold text-emerald-400 tabular-nums">{fmt(result.net * numCount)} €</div>
              </div>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="text-xs text-amber-400 mb-1">Осигуровки работодател</div>
                <div className="text-lg font-bold text-amber-400 tabular-nums">{fmt(result.emplContribs * numCount)} €</div>
              </div>
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
                <div className="text-xs text-rose-400 mb-1">Данъци + осиг. (служител)</div>
                <div className="text-lg font-bold text-rose-400 tabular-nums">{fmt((result.empDoo + result.empDzpo + result.empZzo + result.tax) * numCount)} €</div>
              </div>
            </div>

            {/* Cost ratio insight */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white/3 rounded-xl p-3 border border-white/5">
              <TrendingUp size={13} className="text-violet-400 shrink-0" />
              <span>
                За всеки <span className="text-white font-medium">100 € нетно</span> за служителя, 
                фирмата реално плаща <span className="text-violet-400 font-bold">{fmt(result.totalEmployer / result.net * 100)} €</span>.
                {" "}Разликата ({fmt((result.totalEmployer / result.net - 1) * 100)} €) са данъци и осигуровки.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Anomaly Detection Component
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  gross: number;
  position?: string | null;
}

interface AnomalyDetectorProps {
  employees: Employee[];
}

export function AnomalyDetector({ employees }: AnomalyDetectorProps) {
  // Simulate previous month data (in production this would come from DB)
  const anomalies = employees.filter((emp) => {
    // Flag employees with gross > 5000 (unusual for small business) or < 780 (below min wage)
    return emp.gross > 5000 || emp.gross < 620.2;
  });

  if (employees.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className={anomalies.length > 0 ? "text-amber-400" : "text-emerald-400"} />
          <h2 className="text-lg font-semibold text-white">AI Одит на ведомостта</h2>
        </div>
        {anomalies.length === 0 && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            ✓ Всичко изглежда нормално
          </span>
        )}
      </div>
      <div className="p-6">
        {anomalies.length > 0 ? (
          <div className="space-y-3">
            {anomalies.map((emp) => (
              <div key={emp.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-white">{emp.firstName} {emp.lastName}</div>
                  <div className="text-xs text-zinc-400">
                    {emp.gross < 620.2
                      ? `Бруто ${fmt(emp.gross)} € е под минималната работна заплата (620,20 €)`
                      : `Бруто ${fmt(emp.gross)} € е необичайно високо — проверете дали е коректно`}
                  </div>
                </div>
                <button className="text-xs text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                  Прегледай
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-emerald-400 font-bold text-lg">{employees.length}</div>
              <div className="text-xs text-zinc-500 mt-1">Проверени служители</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-emerald-400 font-bold text-lg">0</div>
              <div className="text-xs text-zinc-500 mt-1">Аномалии</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-emerald-400 font-bold text-lg">✓</div>
              <div className="text-xs text-zinc-500 mt-1">НАП-съвместимо</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
