'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, AlertTriangle, CheckCircle, XCircle, Wallet, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { getPeriods, getClosingPreview, closePeriod, reopenPeriod } from './actions';

type Period = { periodId: string; year: number; periodNumber: number; startDate: string; endDate: string; status: string; fiscalYearStatus: string };
type ClosingPreview = { revenueBreakdown: { accountCode: string; accountName: string; amount: number }[]; expenseBreakdown: { accountCode: string; accountName: string; amount: number }[]; netProfit: number; lines: { account: string; description: string; debit: number; credit: number }[]; balanced: boolean; totalDebit: number; totalCredit: number };

export default function PeriodClosePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ periodId: string; data: ClosingPreview } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getPeriods();
      if (res.success && res.periods) setPeriods(res.periods);
      else setError(res.error);
      setLoading(false);
    }
    load();
  }, []);

  async function handlePreview(periodId: string) {
    setPreviewLoading(true);
    setError(null);
    const res = await getClosingPreview(periodId);
    if (res.success && res.preview) setPreview({ periodId, data: res.preview });
    else setError(res.error);
    setPreviewLoading(false);
  }

  async function handleClose(periodId: string) {
    setClosing(true);
    setError(null);
    const res = await closePeriod(periodId);
    if (res.success) {
      setPeriods((prev) => prev.map((p) => (p.periodId === periodId ? { ...p, status: 'closed' } : p)));
      setPreview(null);
    } else setError(res.error);
    setClosing(false);
  }

  async function handleReopen(periodId: string) {
    setError(null);
    const res = await reopenPeriod(periodId);
    if (res.success) setPeriods((prev) => prev.map((p) => (p.periodId === periodId ? { ...p, status: 'open' } : p)));
    else setError(res.error);
  }

  if (loading) return <div className="p-6 text-zinc-400">Зареждане на периоди...</div>;

  const groupedByYear: Record<number, Period[]> = {};
  periods.forEach((p) => {
    if (!groupedByYear[p.year]) groupedByYear[p.year] = [];
    groupedByYear[p.year].push(p);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Приключване на период</h1>
          <p className="text-zinc-400 text-sm">Месечно и годишно приключване на счетоводни периоди</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {Object.entries(groupedByYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, yearPeriods]) => (
        <Card key={year} className="bg-[#0F1420] border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet size={18} className="text-violet-400" />
              {year} година
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {yearPeriods.map((period) => (
                <div key={period.periodId} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-4">
                    <span className="text-white font-medium min-w-[80px]">Период {period.periodNumber}</span>
                    <span className="text-zinc-400 text-sm">
                      {new Date(period.startDate).toLocaleDateString('bg-BG')} — {new Date(period.endDate).toLocaleDateString('bg-BG')}
                    </span>
                    {period.status === 'closed' ? (
                      <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-800/50 flex items-center gap-1">
                        <Lock size={12} /> Затворен
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-900/30 text-amber-400 border-amber-800/50 flex items-center gap-1">
                        <Unlock size={12} /> Отворен
                      </Badge>
                    )}
                    {period.fiscalYearStatus !== 'open' && (
                      <Badge variant="outline" className="bg-red-900/30 text-red-400 border-red-800/50">
                        Годината е {period.fiscalYearStatus === 'locked' ? 'заключена' : 'затворена'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {period.status === 'open' && period.fiscalYearStatus === 'open' && (
                      <>
                        <Button size="sm" variant="outline" className="border-violet-800/50 text-violet-300 hover:bg-violet-900/30" onClick={() => handlePreview(period.periodId)} disabled={previewLoading}>
                          Преглед
                        </Button>
                        {preview?.periodId === period.periodId && (
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleClose(period.periodId)} disabled={closing}>
                            Приключи
                          </Button>
                        )}
                      </>
                    )}
                    {period.status === 'closed' && (
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800" onClick={() => handleReopen(period.periodId)}>
                        Отвори отново
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {preview && (
        <ClosingPreviewCard preview={preview.data} />
      )}
    </div>
  );
}

function ClosingPreviewCard({ preview }: { preview: ClosingPreview }) {
  const formatAmount = (n: number) =>
    new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

  return (
    <Card className="bg-[#0F1420] border-white/5">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText size={18} className="text-violet-400" />
          Преглед на приключване
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Счетоводната статия, която ще бъде създадена
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {preview.netProfit >= 0 ? (
              <TrendingUp size={16} className="text-green-400" />
            ) : (
              <TrendingDown size={16} className="text-red-400" />
            )}
            <span className="text-zinc-300">Нетна печалба/загуба:</span>
            <span className={`font-bold ${preview.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatAmount(preview.netProfit)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {preview.balanced ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
            <span className="text-zinc-300">Балансирана статия:</span>
            <span className={preview.balanced ? 'text-green-400' : 'text-red-400'}>
              {preview.balanced ? 'Да' : 'Не'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-zinc-400 font-medium">Сметка</th>
                <th className="text-left py-2 text-zinc-400 font-medium">Описание</th>
                <th className="text-right py-2 text-zinc-400 font-medium">Дебит</th>
                <th className="text-right py-2 text-zinc-400 font-medium">Кредит</th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((line, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 font-mono text-white">{line.account}</td>
                  <td className="py-2 text-zinc-300">{line.description}</td>
                  <td className={`py-2 text-right font-mono ${line.debit > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {line.debit > 0 ? formatAmount(line.debit) : '-'}
                  </td>
                  <td className={`py-2 text-right font-mono ${line.credit > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {line.credit > 0 ? formatAmount(line.credit) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="font-bold border-t border-white/20">
                <td className="py-2 text-white" colSpan={2}>Общо</td>
                <td className="py-2 text-right text-amber-400">{formatAmount(preview.totalDebit)}</td>
                <td className="py-2 text-right text-emerald-400">{formatAmount(preview.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
