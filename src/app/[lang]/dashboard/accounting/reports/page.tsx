'use client';
import { useState, useEffect } from 'react';
import { getTrialBalance, getProfitAndLoss, getBalanceSheet, getVATReport } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, RefreshCw, TrendingUp, TrendingDown, Scale, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];
const CUR_YEAR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' лв.';
}

export default function ReportsPage() {
  const [year, setYear] = useState(CUR_YEAR);
  const [month, setMonth] = useState(CUR_MONTH);
  const [loading, setLoading] = useState(false);
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [vat, setVat] = useState<any>(null);

  async function loadAll() {
    setLoading(true);
    const [tbRes, pnlRes, bsRes, vatRes] = await Promise.all([
      getTrialBalance(year),
      getProfitAndLoss(year),
      getBalanceSheet(),
      getVATReport(year, month),
    ]);
    if (tbRes.success) setTrialBalance(tbRes.data);
    if (pnlRes.success) setPnl(pnlRes.data);
    if (bsRes.success) setBalanceSheet(bsRes.data);
    if (vatRes.success) setVat(vatRes.data);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [year, month]);

  const typeColor: Record<string, string> = {
    asset: 'text-blue-600', liability: 'text-rose-600',
    income: 'text-emerald-600', expense: 'text-amber-600', equity: 'text-violet-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Финансови отчети</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Реални данни от осчетоводените статии.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <Button variant="outline" size="sm" className="gap-2" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Опресни
          </Button>
        </div>
      </div>

      <Tabs defaultValue="trial">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="trial">Оборотна ведомост</TabsTrigger>
          <TabsTrigger value="pnl">ОПР</TabsTrigger>
          <TabsTrigger value="balance">Баланс</TabsTrigger>
          <TabsTrigger value="vat">ДДС</TabsTrigger>
        </TabsList>

        {/* ОБОРОТНА ВЕДОМОСТ */}
        <TabsContent value="trial" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Scale size={18} className="text-indigo-600" /> Оборотна ведомост</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Обороти и салда за {year} г.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info('Excel скоро...')}><FileSpreadsheet size={14} /> Excel</Button>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Сметка</TableHead>
                      <TableHead>Наименование</TableHead>
                      <TableHead>Вид</TableHead>
                      <TableHead className="text-right text-blue-600">Дебит оборот</TableHead>
                      <TableHead className="text-right text-rose-600">Кредит оборот</TableHead>
                      <TableHead className="text-right font-bold">Салдо</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Няма публикувани статии за {year} г.</TableCell></TableRow>
                    ) : trialBalance.map((row: any) => (
                      <TableRow key={row.accountNumber}>
                        <TableCell className="font-mono font-semibold text-primary">{row.accountNumber}</TableCell>
                        <TableCell>{row.accountName}</TableCell>
                        <TableCell><span className={`text-xs font-medium ${typeColor[row.accountType] || ''}`}>{row.accountType}</span></TableCell>
                        <TableCell className="text-right text-blue-600 font-mono">{row.debitTotal > 0 ? fmt(row.debitTotal) : '—'}</TableCell>
                        <TableCell className="text-right text-rose-600 font-mono">{row.creditTotal > 0 ? fmt(row.creditTotal) : '—'}</TableCell>
                        <TableCell className={`text-right font-bold font-mono ${row.balance < 0 ? 'text-rose-600' : ''}`}>{fmt(Math.abs(row.balance))}</TableCell>
                      </TableRow>
                    ))}
                    {trialBalance.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-right">Общо:</TableCell>
                        <TableCell className="text-right text-blue-600 font-mono">{fmt(trialBalance.reduce((s, r) => s + r.debitTotal, 0))}</TableCell>
                        <TableCell className="text-right text-rose-600 font-mono">{fmt(trialBalance.reduce((s, r) => s + r.creditTotal, 0))}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ОПР */}
        <TabsContent value="pnl" className="mt-6">
          <div className="space-y-5">
            {pnl && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-emerald-200 dark:border-emerald-900">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2"><TrendingUp size={15} className="text-emerald-600" /> Общо приходи</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-emerald-600">{fmt(pnl.totalIncome)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-rose-200 dark:border-rose-900">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2"><TrendingDown size={15} className="text-rose-600" /> Общо разходи</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-rose-600">{fmt(pnl.totalExpenses)}</div></CardContent>
                </Card>
                <Card className={`shadow-sm ${pnl.netProfit >= 0 ? 'border-indigo-200' : 'border-red-300'}`}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Финансов резултат</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${pnl.netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{pnl.netProfit >= 0 ? '+' : ''}{fmt(pnl.netProfit)}</div>
                    <Badge className={`mt-1 text-xs ${pnl.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{pnl.netProfit >= 0 ? 'Печалба' : 'Загуба'}</Badge>
                  </CardContent>
                </Card>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base text-emerald-600">Приходи</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Сметка</TableHead><TableHead>Наименование</TableHead><TableHead className="text-right">Сума</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {!pnl || pnl.incomeRows.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Няма данни</TableCell></TableRow>
                      ) : pnl.incomeRows.map((r: any) => (
                        <TableRow key={r.accountNumber}>
                          <TableCell className="font-mono text-sm text-primary">{r.accountNumber}</TableCell>
                          <TableCell className="text-sm">{r.accountName}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{fmt(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      {pnl && pnl.incomeRows.length > 0 && (
                        <TableRow className="bg-muted/50"><TableCell colSpan={2} className="font-bold text-right">Общо:</TableCell><TableCell className="text-right font-bold text-emerald-600">{fmt(pnl.totalIncome)}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base text-rose-600">Разходи</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Сметка</TableHead><TableHead>Наименование</TableHead><TableHead className="text-right">Сума</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {!pnl || pnl.expenseRows.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Няма данни</TableCell></TableRow>
                      ) : pnl.expenseRows.map((r: any) => (
                        <TableRow key={r.accountNumber}>
                          <TableCell className="font-mono text-sm text-primary">{r.accountNumber}</TableCell>
                          <TableCell className="text-sm">{r.accountName}</TableCell>
                          <TableCell className="text-right font-medium text-rose-600">{fmt(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      {pnl && pnl.expenseRows.length > 0 && (
                        <TableRow className="bg-muted/50"><TableCell colSpan={2} className="font-bold text-right">Общо:</TableCell><TableCell className="text-right font-bold text-rose-600">{fmt(pnl.totalExpenses)}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* БАЛАНС */}
        <TabsContent value="balance" className="mt-6">
          <div className="space-y-4">
            {balanceSheet && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Активи</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{fmt(balanceSheet.totalAssets)}</div></CardContent></Card>
                <Card className="shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Пасиви</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-rose-600">{fmt(balanceSheet.totalLiabilities)}</div></CardContent></Card>
                <Card className="shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Капитал</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-violet-600">{fmt(balanceSheet.totalEquity)}</div></CardContent></Card>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base text-blue-600">АКТИВИ</CardTitle><p className="text-xs text-muted-foreground">към {balanceSheet?.asOf || '—'}</p></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Сметка</TableHead><TableHead>Наименование</TableHead><TableHead className="text-right">Стойност</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {!balanceSheet || balanceSheet.assetRows.filter((r: any) => r.balance !== 0).length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Няма данни</TableCell></TableRow>
                      ) : balanceSheet.assetRows.filter((r: any) => r.balance !== 0).map((r: any) => (
                        <TableRow key={r.accountNumber}><TableCell className="font-mono text-sm text-primary">{r.accountNumber}</TableCell><TableCell className="text-sm">{r.accountName}</TableCell><TableCell className="text-right font-medium">{fmt(r.balance)}</TableCell></TableRow>
                      ))}
                      {balanceSheet && <TableRow className="bg-muted/50"><TableCell colSpan={2} className="text-right font-bold">Сума активи:</TableCell><TableCell className="text-right font-bold text-blue-600">{fmt(balanceSheet.totalAssets)}</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader><CardTitle className="text-base text-rose-600">ПАСИВИ + КАПИТАЛ</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Сметка</TableHead><TableHead>Наименование</TableHead><TableHead className="text-right">Стойност</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {!balanceSheet || (balanceSheet.liabilityRows.length === 0 && balanceSheet.equityRows.length === 0) ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Няма данни</TableCell></TableRow>
                      ) : (
                        <>
                          {balanceSheet.liabilityRows.filter((r: any) => r.balance !== 0).map((r: any) => (
                            <TableRow key={r.accountNumber}><TableCell className="font-mono text-sm text-primary">{r.accountNumber}</TableCell><TableCell className="text-sm">{r.accountName}</TableCell><TableCell className="text-right font-medium text-rose-600">{fmt(r.balance)}</TableCell></TableRow>
                          ))}
                          {balanceSheet.equityRows.filter((r: any) => r.balance !== 0).map((r: any) => (
                            <TableRow key={r.accountNumber}><TableCell className="font-mono text-sm text-primary">{r.accountNumber}</TableCell><TableCell className="text-sm">{r.accountName}</TableCell><TableCell className="text-right font-medium text-violet-600">{fmt(r.balance)}</TableCell></TableRow>
                          ))}
                          <TableRow className="bg-muted/50"><TableCell colSpan={2} className="text-right font-bold">Пасиви + Капитал:</TableCell><TableCell className="text-right font-bold text-rose-600">{fmt(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</TableCell></TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ДДС */}
        <TabsContent value="vat" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt size={18} className="text-amber-600" /> ДДС Декларация — {MONTHS[month - 1]} {year}</CardTitle>
              <p className="text-sm text-muted-foreground">Справка по чл. 125 ЗДДС</p>
            </CardHeader>
            <CardContent>
              {!vat ? <p className="text-muted-foreground py-8 text-center text-sm">Зареждане...</p> : (
                <div className="space-y-6 max-w-xl">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Раздел I — Продажби</h3>
                    <div className="rounded-lg border divide-y">
                      <div className="flex justify-between px-4 py-3"><span className="text-sm">Данъчна основа (код 11)</span><span className="font-mono font-medium">{fmt(vat.salesNet)}</span></div>
                      <div className="flex justify-between px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20"><span className="text-sm font-medium">Начислен ДДС (код 20)</span><span className="font-mono font-bold text-amber-700">{fmt(vat.salesVat)}</span></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Раздел II — Покупки</h3>
                    <div className="rounded-lg border divide-y">
                      <div className="flex justify-between px-4 py-3"><span className="text-sm">Данъчна основа (код 21)</span><span className="font-mono font-medium">{fmt(vat.purchasesNet)}</span></div>
                      <div className="flex justify-between px-4 py-3 bg-blue-50/50 dark:bg-blue-950/20"><span className="text-sm font-medium">ДДС за приспадане (код 41)</span><span className="font-mono font-bold text-blue-700">{fmt(vat.purchasesVat)}</span></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Резултат</h3>
                    <div className="rounded-lg border divide-y">
                      {vat.vatPayable > 0 && (
                        <div className="flex justify-between px-4 py-3 bg-rose-50 dark:bg-rose-950/30">
                          <span className="font-medium text-rose-700">ДДС за внасяне (код 31)</span>
                          <span className="font-mono font-bold text-rose-700 text-lg">{fmt(vat.vatPayable)}</span>
                        </div>
                      )}
                      {vat.vatRefundable > 0 && (
                        <div className="flex justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30">
                          <span className="font-medium text-emerald-700">ДДС за възстановяване (код 32)</span>
                          <span className="font-mono font-bold text-emerald-700 text-lg">{fmt(vat.vatRefundable)}</span>
                        </div>
                      )}
                      {vat.vatPayable === 0 && vat.vatRefundable === 0 && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Няма движения за {MONTHS[month - 1]} {year}.</div>
                      )}
                    </div>
                  </div>
                  <Button className="gap-2 w-full" variant="outline" onClick={() => toast.info('XML за НАП — скоро...')}>
                    <Receipt size={15} /> Генерирай XML за НАП
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}