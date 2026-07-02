import React from 'react';
import { getAccountingData } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccountingActionButtons } from './_action-buttons';
import { PendingInvoicesQueue } from './PendingInvoicesQueue';

export default async function AccountingPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const res = await getAccountingData(params.lang);
  if (!res.success || !res.data) {
    return <Card className="border-red-500/30 bg-red-500/10"><CardContent className="p-6 text-red-700 dark:text-red-300"><h1 className="text-xl font-semibold">Счетоводство</h1><p className="mt-2">{res.error || 'Грешка при зареждане на счетовните данни.'}</p></CardContent></Card>;
  }
  const data = res.data;

  const drafts = data.headers.filter(h => h.status === 'draft');
  const problems = data.headers.filter(h => h.aiStatus === 'problem');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Счетоводство</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Регистър на счетоводни движения и опашка за осчетоводяване.</p>
        </div>
        <AccountingActionButtons lang={params.lang} />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
          <TabsTrigger value="all" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Всички записи</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex gap-2">
            Чакат осчетоводяване <Badge variant="secondary" className="h-5 px-1.5">{data.pendingItems.length}</Badge>
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
              <CardTitle className="text-lg">Опашка за осчетоводяване</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PendingInvoicesQueue lang={params.lang} items={data.pendingItems} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4 m-0">
          <JournalEntriesTable entries={drafts} emptyText="Няма чернови." />
        </TabsContent>

        <TabsContent value="problems" className="space-y-4 m-0">
          <JournalEntriesTable entries={problems} emptyText="Няма открити проблеми от AI." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JournalEntriesTable({ entries, emptyText }: { entries: Array<{ id: string; entryDate: Date; journalNumber: string; description: string | null; status: string | null; aiReasoning?: string | null }>; emptyText: string }) {
  return <Card className="shadow-sm border-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Дата</TableHead><TableHead>Номер</TableHead><TableHead>Описание</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader><TableBody>
    {entries.map((entry) => <TableRow key={entry.id}><TableCell className="pl-6">{new Date(entry.entryDate).toLocaleDateString('bg-BG')}</TableCell><TableCell className="font-mono">{entry.journalNumber}</TableCell><TableCell><p>{entry.description || '—'}</p>{entry.aiReasoning && <p className="text-xs text-muted-foreground">{entry.aiReasoning}</p>}</TableCell><TableCell><Badge variant="outline">{entry.status === 'posted' ? 'Публикувана' : entry.status === 'canceled' ? 'Анулирана' : 'Чернова'}</Badge></TableCell></TableRow>)}
    {!entries.length && <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">{emptyText}</TableCell></TableRow>}
  </TableBody></Table></CardContent></Card>;
}
