import React from 'react';
import { getVatData } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, TrendingDown, TrendingUp, DollarSign, FileText } from 'lucide-react';

import { VatActions } from '@/components/dashboard/VatActions';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function VatPage() {
  const res = await getVatData();
  const data = res.success && res.data ? res.data : { purchases: [], sales: [], problems: [], kpi: { totalVatPurchases: 0, totalVatSales: 0, netVat: 0 } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ДДС Дневници</h1>
          <p className="text-sm text-muted-foreground mt-0.5">VAT Auditor и генериране на файлове за НАП.</p>
        </div>
        <VatActions />
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><TrendingDown size={14}/> ДДС Покупки (Дневник на покупките)</p>
              <p className="text-2xl font-bold">{fmt(data.kpi.totalVatPurchases)} €</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><TrendingUp size={14}/> ДДС Продажби (Дневник на продажбите)</p>
              <p className="text-2xl font-bold">{fmt(data.kpi.totalVatSales)} €</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0 bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm flex items-center gap-2 mb-1 opacity-80"><DollarSign size={14}/> Резултат за периода</p>
              <p className="text-2xl font-bold">
                {data.kpi.netVat > 0 ? 'Внасяне: ' : 'Възстановяване: '}
                {fmt(Math.abs(data.kpi.netVat))} €
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="problems" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
          <TabsTrigger value="purchases" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Покупки ({data.purchases.length})</TabsTrigger>
          <TabsTrigger value="sales" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Продажби ({data.sales.length})</TabsTrigger>
          <TabsTrigger value="problems" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex gap-2">
            AI Auditor Проблеми 
            {data.problems.length > 0 && <Badge variant="destructive" className="h-5 px-1.5">{data.problems.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="m-0">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Дневник на покупките</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Фактура</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Контрагент</TableHead>
                    <TableHead className="text-right">Данъчна основа</TableHead>
                    <TableHead className="text-right">ДДС</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.purchases.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 font-mono text-sm">{p.invoiceNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{p.issueDate ? new Date(p.issueDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                      <TableCell>{p.counterpartyName}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(parseFloat(p.totalAmount||'0') - parseFloat(p.vatAmount||'0'))}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmt(parseFloat(p.vatAmount||'0'))}</TableCell>
                    </TableRow>
                  ))}
                  {data.purchases.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Няма покупки.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="m-0">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Дневник на продажбите</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Фактура</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Контрагент</TableHead>
                    <TableHead className="text-right">Данъчна основа</TableHead>
                    <TableHead className="text-right">ДДС</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="pl-6 font-mono text-sm">{s.invoiceNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{s.issueDate ? new Date(s.issueDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                      <TableCell>{s.counterpartyName}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(parseFloat(s.totalAmount||'0') - parseFloat(s.vatAmount||'0'))}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmt(parseFloat(s.vatAmount||'0'))}</TableCell>
                    </TableRow>
                  ))}
                  {data.sales.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Няма продажби.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problems" className="m-0">
          <Card className="shadow-sm border-0 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                <AlertTriangle size={18} /> Открити проблеми
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Обект</TableHead>
                    <TableHead>Описание на проблема</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.problems.map((prob: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-muted-foreground"/>
                          <span className="font-medium text-sm">Фактура {prob.invoiceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-amber-800">{prob.issue}</p>
                        <p className="text-xs text-muted-foreground">Контрагент: {prob.counterpartyName}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8">Коригирай</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.problems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-emerald-600">
                        Всичко изглежда наред! Няма открити грешки от VAT Auditor.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
