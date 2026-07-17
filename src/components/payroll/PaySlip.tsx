// @ts-nocheck
'use client';

import React from 'react';
import type { PayrollBreakdown } from '@/lib/payroll/calculator';
import { Printer, Building2, User, Calendar, FileText } from 'lucide-react';

interface PaySlipProps {
  employee: any;
  calc: PayrollBreakdown;
  month: string;
  year: number;
}

function fmtBGN(n: number): string {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' лв.';
}

function fmtPct(n: number): string {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

export function PaySlip({ employee, calc, month, year }: PaySlipProps) {
  const handlePrint = () => {
    window.print();
  };

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const periodLabel = `${month} ${year}`;

  return (
    <>
      {/* ─── Print-only global styles ─── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #payslip-print-root { display: block !important; }
          #payslip-print-root * { display: revert !important; }
          .payslip-no-print { display: none !important; }

          #payslip-print-root {
            position: fixed;
            inset: 0;
            width: 100%;
            padding: 24px;
            background: white;
            color: black;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
          }

          .payslip-card {
            background: white !important;
            color: black !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }

          .payslip-header-bg {
            background: #1e1b4b !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .payslip-row-highlight {
            background: #f5f3ff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .payslip-net-row {
            background: #ecfdf5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .payslip-employer-section {
            background: #fef3c7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div id="payslip-print-root" className="relative">

        {/* Print button — hidden on print */}
        <div className="payslip-no-print flex justify-end mb-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 border border-indigo-400/30 transition-all duration-150"
          >
            <Printer size={16} />
            Принтирай фиш
          </button>
        </div>

        {/* ─── Payslip card ─── */}
        <div
          className="payslip-card rounded-2xl overflow-hidden border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(15,23,42,0.97) 100%)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.15), 0 25px 50px -12px rgba(0,0,0,0.6)',
          }}
        >
          {/* ─── Header ─── */}
          <div
            className="payslip-header-bg px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
              borderBottom: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-400/20 border border-indigo-400/30 flex items-center justify-center">
                <Building2 size={24} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">Разчетно-платежна ведомост</p>
                <h2 className="text-white text-xl font-bold mt-0.5">
                  {employee.company || 'Officia'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
              <FileText size={18} className="text-indigo-300" />
              <div className="text-right">
                <p className="text-indigo-300 text-xs font-medium">Период</p>
                <p className="text-white font-bold">{periodLabel}</p>
              </div>
            </div>
          </div>

          {/* ─── Employee info ─── */}
          <div className="px-8 py-5 border-b border-white/8 flex flex-wrap gap-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                <User size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Служител</p>
                <p className="text-white font-semibold text-sm">{fullName}</p>
              </div>
            </div>

            {employee.position && (
              <div>
                <p className="text-zinc-500 text-xs">Длъжност</p>
                <p className="text-zinc-200 font-medium text-sm">{employee.position}</p>
              </div>
            )}

            {employee.department && (
              <div>
                <p className="text-zinc-500 text-xs">Отдел</p>
                <p className="text-zinc-200 font-medium text-sm">{employee.department}</p>
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                <Calendar size={16} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Период</p>
                <p className="text-white font-semibold text-sm">{periodLabel}</p>
              </div>
            </div>
          </div>

          {/* ─── Breakdown ─── */}
          <div className="px-8 py-6 space-y-6">

            {/* ── Gross ── */}
            <div className="flex items-center justify-between py-3.5 px-5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <span className="text-zinc-300 font-semibold">Брутна заплата (Обеми/Ставка)</span>
              <span className="text-violet-300 font-bold text-lg tabular-nums">{fmtBGN(calc.grossSalary)}</span>
            </div>

            {calc.adjustments && (
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2 text-xs">
                <p className="text-indigo-400 font-semibold uppercase tracking-wider mb-2">Отпуски и болнични (ЧР Интеграция)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-300">
                  <div>Работни дни: <span className="text-white font-bold">{calc.adjustments.workingDays || 21}</span></div>
                  <div>Отработени: <span className="text-emerald-400 font-bold">{calc.adjustments.workedDays || 0}</span></div>
                  <div>Платен отпуск: <span className="text-blue-400 font-bold">{calc.adjustments.paidLeaveDays || 0} дни</span></div>
                  <div>Болничен (Раб.): <span className="text-amber-400 font-bold">{calc.adjustments.sickDaysEmployer || 0} дни ({fmtBGN(calc.sickLeaveCompEmployer || 0)})</span></div>
                </div>
                {calc.effectiveGross !== calc.grossSalary && (
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm">
                    <span className="text-zinc-400 font-medium">Ефективна осигурителна база (след отпуски):</span>
                    <span className="text-indigo-300 font-bold tabular-nums">{fmtBGN(calc.effectiveGross)}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Employee contributions ── */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Осигуровки — Служител</p>
              <div className="rounded-xl overflow-hidden border border-white/8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th className="text-left py-2.5 px-5 text-zinc-500 font-medium text-xs">Вид осигуровка</th>
                      <th className="text-right py-2.5 px-5 text-zinc-500 font-medium text-xs">Ставка</th>
                      <th className="text-right py-2.5 px-5 text-zinc-500 font-medium text-xs">Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-5 text-zinc-300">ДОО — Държавно обществено осигуряване</td>
                      <td className="py-3 px-5 text-right text-zinc-500 tabular-nums">7.90%</td>
                      <td className="py-3 px-5 text-right text-zinc-200 tabular-nums font-medium">{fmtBGN(calc.employee.doo)}</td>
                    </tr>
                    <tr className="border-t border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-5 text-zinc-300">ДЗПО — Допълнително задължително пенсионно</td>
                      <td className="py-3 px-5 text-right text-zinc-500 tabular-nums">2.80%</td>
                      <td className="py-3 px-5 text-right text-zinc-200 tabular-nums font-medium">{fmtBGN(calc.employee.dzpo)}</td>
                    </tr>
                    <tr className="border-t border-white/5 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-5 text-zinc-300">ЗО — Здравно осигуряване</td>
                      <td className="py-3 px-5 text-right text-zinc-500 tabular-nums">2.20%</td>
                      <td className="py-3 px-5 text-right text-zinc-200 tabular-nums font-medium">{fmtBGN(calc.employee.zo)}</td>
                    </tr>
                    <tr className="border-t border-white/5 payslip-row-highlight" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <td className="py-3 px-5 text-indigo-300 font-semibold">Общо осигуровки служител</td>
                      <td className="py-3 px-5 text-right text-indigo-400 tabular-nums font-semibold">12.90%</td>
                      <td className="py-3 px-5 text-right text-indigo-300 tabular-nums font-bold">{fmtBGN(calc.employee.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Tax ── */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Данък върху доходите</p>
              <div className="rounded-xl overflow-hidden border border-white/8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <table className="w-full text-sm">
                  <tbody>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <td className="py-3 px-5 text-zinc-400">Данъчна основа (бруто − осигуровки)</td>
                      <td className="py-3 px-5 text-right text-zinc-300 tabular-nums">{fmtBGN(calc.taxBase)}</td>
                    </tr>
                    <tr className="border-t border-white/5" style={{ background: 'rgba(239,68,68,0.06)' }}>
                      <td className="py-3 px-5 text-rose-300">ДДФЛ — Данък върху доходите на физически лица (10%)</td>
                      <td className="py-3 px-5 text-right text-rose-300 tabular-nums font-bold">{fmtBGN(calc.ddfl)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Net salary ── */}
            <div
              className="payslip-net-row flex items-center justify-between py-4 px-6 rounded-xl border"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)',
                borderColor: 'rgba(16,185,129,0.25)',
              }}
            >
              <div>
                <p className="text-emerald-400 font-bold text-lg">Нетна заплата</p>
                <p className="text-zinc-500 text-xs mt-0.5">За изплащане по сметка</p>
              </div>
              <span className="text-emerald-400 font-black text-2xl tabular-nums drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                {fmtBGN(calc.netSalary)}
              </span>
            </div>

            {/* ── Employer contributions ── */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Осигуровки — Работодател (информативно)</p>
              <div
                className="payslip-employer-section rounded-xl overflow-hidden border"
                style={{ borderColor: 'rgba(245,158,11,0.2)' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(245,158,11,0.08)' }}>
                      <th className="text-left py-2.5 px-5 text-amber-500/70 font-medium text-xs">Вид осигуровка</th>
                      <th className="text-right py-2.5 px-5 text-amber-500/70 font-medium text-xs">Ставка</th>
                      <th className="text-right py-2.5 px-5 text-amber-500/70 font-medium text-xs">Сума</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-amber-500/10">
                      <td className="py-2.5 px-5 text-zinc-400">ДОО работодател</td>
                      <td className="py-2.5 px-5 text-right text-zinc-500 tabular-nums">10.92%</td>
                      <td className="py-2.5 px-5 text-right text-zinc-300 tabular-nums font-medium">{fmtBGN(calc.employer.doo)}</td>
                    </tr>
                    <tr className="border-t border-amber-500/10">
                      <td className="py-2.5 px-5 text-zinc-400">ДЗПО работодател</td>
                      <td className="py-2.5 px-5 text-right text-zinc-500 tabular-nums">4.00%</td>
                      <td className="py-2.5 px-5 text-right text-zinc-300 tabular-nums font-medium">{fmtBGN(calc.employer.dzpo)}</td>
                    </tr>
                    <tr className="border-t border-amber-500/10">
                      <td className="py-2.5 px-5 text-zinc-400">ЗО работодател</td>
                      <td className="py-2.5 px-5 text-right text-zinc-500 tabular-nums">4.00%</td>
                      <td className="py-2.5 px-5 text-right text-zinc-300 tabular-nums font-medium">{fmtBGN(calc.employer.zo)}</td>
                    </tr>
                    <tr className="border-t border-amber-500/10" style={{ background: 'rgba(245,158,11,0.06)' }}>
                      <td className="py-3 px-5 text-amber-400 font-semibold">Общо осигуровки работодател</td>
                      <td className="py-3 px-5 text-right text-amber-500 tabular-nums font-semibold">18.92%</td>
                      <td className="py-3 px-5 text-right text-amber-400 tabular-nums font-bold">{fmtBGN(calc.employer.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Total employer cost ── */}
            <div className="flex items-center justify-between py-3.5 px-5 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <div>
                <p className="text-amber-300 font-semibold">Общ разход за работодателя</p>
                <p className="text-zinc-500 text-xs mt-0.5">Бруто + осигуровки работодател</p>
              </div>
              <span className="text-amber-300 font-bold text-lg tabular-nums">{fmtBGN(calc.totalEmployerCost)}</span>
            </div>

          </div>

          {/* ─── Footer ─── */}
          <div className="px-8 py-4 border-t border-white/6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p>Осигурителна основа: {fmtBGN(calc.insuranceBase)} (макс. {fmtBGN(calc.maxInsuranceBase)})</p>
            <p>Ставки: ДОО 7.9% / ДЗПО 2.8% / ЗО 2.2% / ДДФЛ 10% (2024)</p>
          </div>
        </div>
      </div>
    </>
  );
}
