// @ts-nocheck
import React from 'react';
import { getAccountingData } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertCircle, Clock, Plus, Zap, FileText } from 'lucide-react';

import { AccountingActionButtons } from './_action-buttons';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AccountingPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const res = await getAccountingData();
  const data = res.success ? res.data : { headers: [], lines: [], pendingInvoices: [] };

  const drafts = data.headers.filter(h => h.status === 'draft');
  const problems = data.headers.filter(h => h.aiStatus === 'problem');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Счетоводство</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Регистър на счетоводни движения и AI Асистент.</p>
        </div>
        <AccountingActionButtons lang={params.lang} />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
          <TabsTrigger value="all" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Всички записи</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex gap-2">
            Чакат осчетоводяване <Badge variant="secondary" className="h-5 px-1.5">{data.pendingInvoices.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex gap-2">
            Чернови <Badge variant="secondary" className="h-5 px-1.5">{drafts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="problems" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex gap-2">
            Проблеми {problems.length > 0 && <Badge variant="destructive" className="h-5 px-1.5">{problems.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* All Entries */}
        <TabsContent value="all" className="space-y-4 m-0">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Регистър</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Дата</TableHead>
                    <TableHead>Номер</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.headers.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="pl-6 text-muted-foreground">{new Date(h.entryDate).toLocaleDateString('bg-BG')}</TableCell>
                      <TableCell className="font-mono text-sm">{h.journalNumber}</TableCell>
                      <TableCell>{h.description || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={h.status === 'posted' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : ''}>
                          {h.status === 'posted' ? 'Публикувана' : 'Чернова'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.headers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Няма намерени записи.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending / Accounting Queue */}
        <TabsContent value="pending" className="space-y-4 m-0">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Очакват осчетоводяване</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Източник</TableHead>
                    <TableHead>Основание / Описание</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                    <TableHead>AI Предложение (Сметка)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pendingInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-indigo-500"/>
                          <span className="font-medium text-sm">Фактура {inv.invoiceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{inv.counterpartyName}</p>
                        <p className="text-xs text-muted-foreground">Издадена на {new Date(inv.issueDate).toLocaleDateString('bg-BG')}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-sm">
                        {fmt(parseFloat(inv.totalAmount || '0'))} €
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 gap-1">
                            <Zap size={12}/> Предложение: Сметка 411 (Клиенти)
                          </Badge>
                          <span className="text-xs text-muted-foreground max-w-[250px] truncate">
                            Въз основа на предишни продажби към същия контрагент.
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">Приеми</Button>
                          <Button variant="ghost" size="sm" className="h-8">Детайли</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.pendingInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2"/>
                        Всички документи са осчетоводени.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4 m-0">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock size={18} className="text-amber-500" /> Чернови ({drafts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Дата</TableHead>
                    <TableHead>Номер</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="pl-6 text-muted-foreground">{new Date(h.entryDate).toLocaleDateString('bg-BG')}</TableCell>
                      <TableCell className="font-mono text-sm">{h.journalNumber}</TableCell>
                      <TableCell>{h.description || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-emerald-600 hover:bg-emerald-50">Публикувай</Button>
                          <Button variant="ghost" size="sm" className="h-8">Редактирай</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {drafts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                        Няма чернови за публикуване.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problems" className="space-y-4 m-0">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" /> AI Одит – Проблеми ({problems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Дата</TableHead>
                    <TableHead>Номер</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problems.map(h => (
                    <TableRow key={h.id} className="border-l-2 border-l-rose-400">
                      <TableCell className="pl-6 text-muted-foreground">{new Date(h.entryDate).toLocaleDateString('bg-BG')}</TableCell>
                      <TableCell className="font-mono text-sm">{h.journalNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p>{h.description || '—'}</p>
                          <Badge variant="destructive" className="mt-1 text-xs">AI: Открит проблем</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8 text-rose-600 hover:bg-rose-50 border-rose-200">Прегледай</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {problems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                        AI не е открил проблеми в счетоводните записи.
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