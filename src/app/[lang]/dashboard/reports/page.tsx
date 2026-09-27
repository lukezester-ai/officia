import React from 'react';
import Link from 'next/link';
import { getReportsData } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle } from '@/components/icons';
import { ReportsPrintButton } from './ReportsPrintButton';
import { ReportsCsvButton } from './ReportsCsvButton';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLine(thisLabel: string, thisAmount: number, lastLabel: string, lastAmount: number, percent: number | null) {
  const base = `${thisLabel} ${fmt(thisAmount)} € · ${lastLabel} ${fmt(lastAmount)} €`;
  if (percent === null) return `${base} · няма база за процент`;
  const signed = percent > 0 ? `+${percent}` : String(percent);
  return `${base} · ${signed}% към миналия месец`;
}

export default async function ReportsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const res = await getReportsData();
  const data = res.data;
  const csvRows = [
    { label: 'Продажби', value: fmt(data.revenue) },
    { label: 'Покупки', value: fmt(data.expenses) },
    { label: 'Разлика', value: fmt(data.difference) },
    { label: `Продажби ${data.thisMonthLabel}`, value: fmt(data.salesThisMonth) },
    { label: `Продажби ${data.lastMonthLabel}`, value: fmt(data.salesLastMonth) },
    { label: `Покупки ${data.thisMonthLabel}`, value: fmt(data.purchasesThisMonth) },
    { label: `Покупки ${data.lastMonthLabel}`, value: fmt(data.purchasesLastMonth) },
    { label: 'Просрочени фактури', value: String(data.overdueCount) },
    { label: 'Просрочена сума', value: fmt(data.overdueAmount) },
    { label: 'Покупки с падеж до 7 дни', value: String(data.dueThisWeekCount) },
    { label: 'Сума с падеж до 7 дни', value: fmt(data.dueThisWeekAmount) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отчети от фактурите</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Издадени продажби и одобрени покупки. Черновите не влизат. Това не е баланс от журнала.</p>
        </div>
        <div className="flex gap-2">
          <ReportsCsvButton rows={csvRows} />
          <ReportsPrintButton />
        </div>
      </div>

      {!res.success ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Базата не върна фактурите. Нулите по-долу не са отчет.
        </div>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-100">
        {data.lines.map((line) => <p key={line}>{line}</p>)}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Продажби</p>
            <h3 className="text-3xl font-bold tabular-nums">{fmt(data.revenue)} €</h3>
            <p className="mt-2 text-xs text-muted-foreground">{monthLine(data.thisMonthLabel, data.salesThisMonth, data.lastMonthLabel, data.salesLastMonth, data.salesChangePercent)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Покупки</p>
            <h3 className="text-3xl font-bold tabular-nums">{fmt(data.expenses)} €</h3>
            <p className="mt-2 text-xs text-muted-foreground">{monthLine(data.thisMonthLabel, data.purchasesThisMonth, data.lastMonthLabel, data.purchasesLastMonth, data.purchasesChangePercent)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-slate-900 text-white shadow-sm dark:bg-slate-50 dark:text-slate-900">
          <CardContent className="p-6">
            <p className="mb-2 text-sm font-medium opacity-80">Разлика от фактури</p>
            <h3 className="text-3xl font-bold tabular-nums">{fmt(data.difference)} €</h3>
            <p className="mt-2 text-xs opacity-70">Продажби минус покупки. Не е печалба от баланса.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Просрочени продажби</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Издадени, с падеж преди днес</p>
              <h4 className="mt-1 text-xl font-bold tabular-nums">{fmt(data.overdueAmount)} €</h4>
              <p className="mt-1 text-sm text-rose-600">{data.overdueCount} бр.</p>
            </div>
            <Link href={`/${lang}/dashboard/invoices`} className="text-sm font-medium text-indigo-600 hover:underline">Към фактурите</Link>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Покупки до 7 дни</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Одобрени, с падеж от днес до 7 дни</p>
              <h4 className="mt-1 text-xl font-bold tabular-nums">{fmt(data.dueThisWeekAmount)} €</h4>
              <p className="mt-1 text-sm text-muted-foreground">{data.dueThisWeekCount} бр.</p>
            </div>
            <Link href={`/${lang}/dashboard/purchase-invoices`} className="text-sm font-medium text-indigo-600 hover:underline">Към покупките</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-indigo-500/10 p-3.5 text-indigo-500"><FileText size={24} /></div>
            <div>
              <p className="text-sm text-muted-foreground">Качени документи</p>
              <h3 className="mt-1 text-2xl font-bold">{data.docsCount} бр.</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-emerald-500/10 p-3.5 text-emerald-500"><CheckCircle size={24} /></div>
            <div>
              <p className="text-sm text-muted-foreground">С разпознат текст</p>
              <h3 className="mt-1 text-2xl font-bold">{data.recognizedPercent === null ? '—' : `${data.recognizedPercent}%`}</h3>
              <p className="text-xs text-muted-foreground">{data.analyzedDocsCount} от {data.docsCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Съпоставени банкови движения</p>
            <h3 className="mt-1 text-2xl font-bold">{data.reconciledPercent === null ? '—' : `${data.reconciledPercent}%`}</h3>
            <p className="text-xs text-muted-foreground">{data.reconciledCount} от {data.transactionsCount}. Процентът е дял, не точност на модел.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Последни документи</CardTitle>
        </CardHeader>
        <CardContent>
          {data.allDocs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Няма качени документи</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Наименование</th>
                    <th className="pb-3 font-medium">Вид</th>
                    <th className="pb-3 font-medium">Статус</th>
                    <th className="pb-3 text-right font-medium">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.allDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td className="flex items-center gap-2 py-3 font-medium">
                        <FileText size={15} className="text-indigo-400" />
                        {doc.title}
                      </td>
                      <td className="py-3 text-muted-foreground">{doc.type}</td>
                      <td className="py-3">
                        <Badge variant="secondary" className="border-indigo-500/20 bg-indigo-500/10 font-normal text-indigo-500">
                          {doc.status === 'processed' || doc.status === 'analyzed' ? 'Разпознат' : doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">{doc.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Балансът и отчетът за приходи и разходи се смятат от журнала.{' '}
        <Link href={`/${lang}/dashboard/accounting/reports`} className="font-medium text-indigo-600 hover:underline">Към отчетите от журнала</Link>
      </p>
    </div>
  );
}
