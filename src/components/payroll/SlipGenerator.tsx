// @ts-nocheck
'use client';

import React, { useState, useTransition } from 'react';
import { calculatePayroll } from '@/lib/payroll/calculator';
import { getEmployeeLeaveAdjustments } from '@/app/[lang]/dashboard/payroll/slip-actions';
import { PaySlip } from '@/components/payroll/PaySlip';
import { FileText, ChevronDown, Loader2, Sparkles } from 'lucide-react';

const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

interface Props {
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    salary: string | null;
    department: string | null;
  }>;
}

export function SlipGenerator({ employees }: Props) {
  const now = new Date();
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!selectedId) return;
    const emp = employees.find((e) => e.id === selectedId);
    if (!emp) return;

    startTransition(async () => {
      const gross = parseFloat(emp.salary || '0');
      const adjRes = await getEmployeeLeaveAdjustments(selectedId, selectedMonth, selectedYear);
      const adjustments = adjRes.success ? adjRes.adjustments : undefined;
      const result = calculatePayroll(gross, selectedMonth, selectedYear, adjustments);
      setCalcResult(result);
      setSelectedEmp(emp);
    });
  };

  const selectCls = `
    w-full rounded-xl border border-white/10 bg-white/5
    text-white text-sm px-4 py-2.5 pr-10
    focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30
    hover:border-white/20 transition-colors
    appearance-none cursor-pointer
  `;

  return (
    <div className="space-y-6">

      {/* ─── Generator card ─── */}
      <div
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30,27,75,0.7) 0%, rgba(15,23,42,0.8) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 8px 32px -8px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3 border-b border-white/8"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <FileText size={15} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Генерирай Ведомост (Фиш)</h2>
            <p className="text-zinc-500 text-xs">Изберете служител, месец и година</p>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">

            {/* Employee selector */}
            <div className="sm:col-span-1">
              <label className="block text-zinc-400 text-xs font-medium mb-1.5">Служител</label>
              <div className="relative">
                <select
                  id="slip-employee-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className={selectCls}
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <option value="" disabled style={{ background: '#0f172a' }}>— Изберете служител —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} style={{ background: '#0f172a' }}>
                      {emp.firstName} {emp.lastName}
                      {emp.position ? ` (${emp.position})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Month selector */}
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-1.5">Месец</label>
              <div className="relative">
                <select
                  id="slip-month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={selectCls}
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m} style={{ background: '#0f172a' }}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Year selector */}
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-1.5">Година</label>
              <div className="relative">
                <select
                  id="slip-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className={selectCls}
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Generate button */}
          <div className="mt-5 flex justify-end">
            <button
              id="slip-generate-btn"
              onClick={handleGenerate}
              disabled={!selectedId || isPending}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-150 active:scale-95
                ${selectedId && !isPending
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/30'
                  : 'bg-white/5 text-zinc-600 border border-white/8 cursor-not-allowed'
                }
              `}
            >
              {isPending
                ? <><Loader2 size={15} className="animate-spin" /> Изчислява…</>
                : <><Sparkles size={15} /> Генерирай</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ─── Generated slip ─── */}
      {calcResult && selectedEmp && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PaySlip
            employee={selectedEmp}
            calc={calcResult}
            month={selectedMonth}
            year={selectedYear}
          />
        </div>
      )}
    </div>
  );
}
