'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { Download, FileSpreadsheet, TrendingUp, TrendingDown, Scale, Wallet, ArrowRight, FileText, BarChart2 } from 'lucide-react';
import { getReportsData } from './actions';
import Link from 'next/link';
import { useParams } from 'next/navigation';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BG_MONTHS = ['Яну', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);
  const [year, setYear]       = useState(new Date().getFullYear());
  const params = useParams();
  const lang = (params?.lang as string) || 'bg';

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getReportsData(year);
      if (res.success) setData(res.data);
      setLoading(false);
    }
    load();
  }, [year]);

  const exportCSV = () => {
    if (!data) return;
    let csv = '\uFEFFМесец,Приходи,Разходи,Печалба\n';
    data.monthlyData.forEach((r: any) => { csv += `${r.name},${r.Приходи},${r.Разходи},${r.Печалба}\n`; });
    const a = document.createElement('a');
    a.href = encodeURI('data:text/csv;charset=utf-8,' + csv);
    a.download = `officia_opr_${year}.csv`;
    a.click();
  };

  const ytdRev    = Math.abs(Number(data?.ytdPnL?.revenue?.total || 0));
  const ytdExp    = Math.abs(Number(data?.ytdPnL?.expenses?.total || 0));
  const netProfit = ytdRev - ytdExp;
  const margin    = ytdRev > 0 ? ((netProfit / ytdRev) * 100).toFixed(1) : '0.0';

  const chartData = (data?.monthlyData || []).map((d: any, i: number) => ({
    ...d,
    name: BG_MONTHS[i] ?? d.name,
  }));

  return (
    <div id="main-content" className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Финансови Отчети</h1>
          <p className="text-zinc-400 mt-1 text-sm">Финансово обобщение за <span className="text-white font-semibold">{year} г.</span></p>
        </div>
        <div className="flex gap-2 print:hidden flex-wrap">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {[...Array(5)].map((_, i) => (
              <option key={i} value={new Date().getFullYear() - i} className="bg-zinc-900">
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCSV} className="gap-2 border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white">
            <FileSpreadsheet size={15} /> Експорт CSV
          </Button>
          <Button onClick={() => window.print()} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Download size={15} /> Свали PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Общо Приходи', value: `${fmt(ytdRev)} €`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Общо Разходи', value: `${fmt(ytdExp)} €`, icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Нетна Печалба', value: `${netProfit >= 0 ? '+' : ''}${fmt(netProfit)} €`, icon: Wallet, color: netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400', bg: netProfit >= 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Марж на печалба', value: `${margin}%`, icon: BarChart2, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(k => (
          <Card key={k.label} className={`border ${k.bg} shadow-sm`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-zinc-400 font-medium">{k.label}</p>
                  <p className={`text-2xl font-bold mt-2 tabular-nums ${k.color}`}>{loading ? '...' : k.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${k.bg}`}>
                  <k.icon size={18} className={k.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="text-white text-base">Приходи и Разходи по месеци — {year} г.</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-zinc-500">Зареждане...</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v} €`} width={70} />
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={(v: any) => [`${fmt(v)} €`]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
                  <Bar dataKey="Приходи" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Разходи" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit trend line */}
      {!loading && chartData.some((d: any) => d.Печалба !== 0) && (
        <Card className="border-white/10 bg-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
            <CardTitle className="text-white text-base">Тренд на печалбата — {year} г.</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `${v} €`} width={70} />
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                    formatter={(v: any) => [`${fmt(v)} €`, 'Печалба']}
                  />
                  <Area type="monotone" dataKey="Печалба" stroke="#6366f1" strokeWidth={2} fill="url(#profitGrad)" dot={{ fill: '#6366f1', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed report navigation cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Детайлни отчети</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              href: `/${lang}/dashboard/accounting/reports/pl`,
              title: 'ОПР — Отчет за Приходите и Разходите',
              desc: 'Разбивка по счетоводни сметки (7xx приходи / 6xx разходи). Нетен финансов резултат.',
              icon: TrendingUp,
              color: 'text-emerald-400',
              border: 'border-emerald-500/20 hover:border-emerald-500/40',
              bg: 'from-emerald-950/30 to-teal-950/20',
            },
            {
              href: `/${lang}/dashboard/accounting/reports/balance`,
              title: 'Счетоводен Баланс',
              desc: 'Актив и пасив към текущата дата. Собствен капитал, задължения, вземания.',
              icon: Scale,
              color: 'text-indigo-400',
              border: 'border-indigo-500/20 hover:border-indigo-500/40',
              bg: 'from-indigo-950/30 to-blue-950/20',
            },
            {
              href: `/${lang}/dashboard/accounting/reports/cashflow`,
              title: 'Паричен Поток',
              desc: 'Входящи и изходящи парични потоци. Нетна промяна в ликвидността.',
              icon: Wallet,
              color: 'text-violet-400',
              border: 'border-violet-500/20 hover:border-violet-500/40',
              bg: 'from-violet-950/30 to-purple-950/20',
            },
          ].map(r => (
            <Link key={r.href} href={r.href}>
              <div className={`group rounded-2xl border ${r.border} bg-gradient-to-br ${r.bg} p-6 h-full transition-all hover:bg-white/5 cursor-pointer`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                    <r.icon size={20} className={r.color} />
                  </div>
                  <ArrowRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition-colors mt-1" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{r.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{r.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #main-content, #main-content * { visibility: visible; }
          #main-content { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
          .print\\:hidden { display: none !important; }
        }
      `}} />
    </div>
  );
}
