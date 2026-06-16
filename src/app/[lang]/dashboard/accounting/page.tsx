'use client';
import { useState, useEffect } from 'react';
import { getInvoices, getJournalEntries, createInvoice, createJournalEntry, postJournalEntry, getAccountPlan, seedAccountPlan } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InvoiceDialog } from '@/components/dashboard/invoice-dialog';
import { JournalEntryDialog } from '@/components/dashboard/journal-entry-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Download, Filter, FileSpreadsheet, Landmark, BookOpen, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const typeColor: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200',
  liability: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200',
  income: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  expense: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200',
  equity: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200',
};
const typeLabel: Record<string, string> = {
  asset: 'Актив', liability: 'Пасив', income: 'Приход', expense: 'Разход', equity: 'Капитал',
};

export default function AccountingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [seedingAccounts, setSeedingAccounts] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [invRes, jrnlRes, accRes] = await Promise.all([getInvoices(), getJournalEntries(), getAccountPlan()]);
      if (invRes.success && invRes.data) setInvoices(invRes.data);
      if (jrnlRes.success && jrnlRes.data) {
        setJournalEntries(jrnlRes.data.map((j: any) => ({
          id: j.id,
          journalNumber: j.journalNumber,
          date: new Date(j.entryDate).toLocaleDateString('bg-BG'),
          description: j.description || '—',
          documentType: j.documentType || 'manual',
          status: j.status,
        })));
      }
      if (accRes.success && accRes.data) setAccounts(accRes.data);
      setLoadingJournal(false);
      setLoadingAccounts(false);
    }
    loadData();
  }, []);

  const handleAddInvoice = async (newInvoice: any) => {
    const res = await createInvoice(newInvoice);
    if (res.success && res.data) { setInvoices(prev => [res.data, ...prev]); toast.success('Фактурата е записана!'); }
    else toast.error('Грешка: ' + res.error);
  };

  const handleAddJournalEntry = async (entryData: any) => {
    const res = await createJournalEntry(entryData);
    if (res.success && res.data) {
      const e = res.data;
      setJournalEntries(prev => [{ id: e.id, journalNumber: e.journalNumber, date: new Date(e.entryDate).toLocaleDateString('bg-BG'), description: e.description || '—', documentType: e.documentType || 'manual', status: e.status }, ...prev]);
      toast.success(`Статия ${e.journalNumber} е записана като чернова.`);
    } else toast.error('Грешка: ' + res.error);
  };

  const handlePostEntry = async (id: string, journalNumber: string) => {
    const res = await postJournalEntry(id);
    if (res.success) { setJournalEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'posted' } : e)); toast.success(`Статия ${journalNumber} е публикувана.`); }
    else toast.error('Грешка: ' + res.error);
  };

  const handleSeedAccounts = async () => {
    setSeedingAccounts(true);
    const res = await seedAccountPlan();
    if (res.success && res.data) { setAccounts(res.data); toast.success(res.message || 'Сметкопланът е зареден!'); }
    else toast.error('Грешка: ' + res.error);
    setSeedingAccounts(false);
  };

  const handleExportExcel = () => {
    try {
      import('xlsx').then((xlsx) => {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(journalEntries.map(e => ({ 'Номер': e.journalNumber, 'Дата': e.date, 'Описание': e.description, 'Статус': e.status })));
        xlsx.utils.book_append_sheet(wb, ws, 'Журнал');
        xlsx.writeFile(wb, 'zhurnal.xlsx');
        toast.success('Експортът е успешен!');
      });
    } catch { toast.error('Грешка при експортиране'); }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Платена</Badge>;
      case 'sent': return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200">Изпратена</Badge>;
      case 'overdue': return <Badge className="bg-red-500/15 text-red-600 border-red-200">Просрочена</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-600 border-gray-200">Чернова</Badge>;
    }
  };

  const getJournalStatusBadge = (status: string) => {
    switch (status) {
      case 'posted': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Публикувана</Badge>;
      case 'canceled': return <Badge className="bg-red-500/15 text-red-600 border-red-200">Сторнирана</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-600 border-gray-200">Чернова</Badge>;
    }
  };

  const unpaidTotal = invoices.filter(i => i.status !== 'paid').reduce((s: number, i: any) => s + parseFloat(i.amount || '0'), 0);
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s: number, i: any) => s + parseFloat(i.amount || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Счетоводство</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Фактури, журнал, сметкоплан и отчети.</p>
        </div>
        <InvoiceDialog onAddInvoice={handleAddInvoice} />
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="invoices">Фактури</TabsTrigger>
          <TabsTrigger value="journal">Журнал</TabsTrigger>
          <TabsTrigger value="ledger">Гл. книга</TabsTrigger>
          <TabsTrigger value="accounts">Сметкоплан</TabsTrigger>
          <TabsTrigger value="reports">Отчети</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Неплатени</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{unpaidTotal.toFixed(2)} лв.</div></CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Платени</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{paidTotal.toFixed(2)} лв.</div></CardContent>
            </Card>
          </div>
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Издадени фактури</CardTitle></CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Няма фактури. Използвай бутона горе.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Фактура</TableHead><TableHead>Клиент</TableHead><TableHead>Сума</TableHead>
                      <TableHead>Издадена</TableHead><TableHead>Падеж</TableHead><TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow key={inv.id} className="group">
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.clientName}</TableCell>
                        <TableCell>{inv.amount} лв.</TableCell>
                        <TableCell className="text-muted-foreground">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toast.info('PDF скоро...')}><FileText className="mr-2 h-4 w-4 text-blue-500" /> Изтегли PDF</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Изпращане...')}><Download className="mr-2 h-4 w-4 text-emerald-500" /> Изпрати</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Хронологичен журнал</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{journalEntries.length} записа</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}><FileSpreadsheet size={14} /> Excel</Button>
                <JournalEntryDialog accounts={accounts} onAdd={handleAddJournalEntry} />
              </div>
            </CardHeader>
            <CardContent>
              {loadingJournal ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
              ) : journalEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Няма вписвания. Използвай „Ново вписване".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номер</TableHead><TableHead>Дата</TableHead><TableHead>Описание</TableHead>
                      <TableHead>Вид</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium text-primary font-mono">{entry.journalNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.date}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{entry.documentType}</TableCell>
                        <TableCell>{getJournalStatusBadge(entry.status)}</TableCell>
                        <TableCell className="text-right">
                          {entry.status === 'draft' && (
                            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handlePostEntry(entry.id, entry.journalNumber)}>
                              <Send size={11} /> Публикувай
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div><CardTitle>Главна книга</CardTitle><p className="text-sm text-muted-foreground mt-0.5">Справка по сметки за текущия период</p></div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info('Генериране...')}><Filter size={14} /> Филтър</Button>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center py-8">Публикувай журнални вписвания за да видиш движенията по сметките.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Сметкоплан (НСУ)</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Национален стандартен сметкоплан — {accounts.length} сметки</p>
              </div>
              {accounts.length === 0 && (
                <Button onClick={handleSeedAccounts} disabled={seedingAccounts} className="gap-2">
                  <RefreshCw size={14} className={seedingAccounts ? 'animate-spin' : ''} />
                  {seedingAccounts ? 'Зареждане...' : 'Зареди НСУ сметки'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
              ) : accounts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <BookOpen size={40} className="mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Сметкопланът е празен.<br />Натисни „Зареди НСУ сметки" за да добавиш стандартните сметки.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Сметка №</TableHead><TableHead>Наименование</TableHead>
                      <TableHead>Тип</TableHead><TableHead>Стандарт</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((acc: any) => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-mono font-semibold text-primary">{acc.accountNumber}</TableCell>
                        <TableCell>{acc.name}</TableCell>
                        <TableCell><Badge className={`text-xs ${typeColor[acc.type] || 'bg-gray-100 text-gray-600'}`}>{typeLabel[acc.type] || acc.type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{acc.standard || 'НСУ'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: FileText, color: 'text-indigo-600', border: 'hover:border-indigo-400', title: 'Оборотна ведомост', desc: 'Обороти и салда по всички сметки за избран период.' },
              { icon: FileText, color: 'text-emerald-600', border: 'hover:border-emerald-400', title: 'Печалби и загуби (ОПР)', desc: 'Финансов резултат — приходи срещу разходи.' },
              { icon: Landmark, color: 'text-blue-600', border: 'hover:border-blue-400', title: 'Счетоводен Баланс', desc: 'Активи, пасиви и собствен капитал.' },
              { icon: FileText, color: 'text-violet-600', border: 'hover:border-violet-400', title: 'Отчет за паричния поток', desc: 'Оперативна, инвестиционна и финансова дейност.' },
              { icon: FileText, color: 'text-amber-600', border: 'hover:border-amber-400', title: 'ДДС Декларация', desc: 'Справка по чл. 125 ЗДДС — готова за НАП.' },
              { icon: FileText, color: 'text-rose-600', border: 'hover:border-rose-400', title: 'Аналитична справка', desc: 'Движение по конкретна сметка с агинг анализ.' },
            ].map((r) => (
              <Card key={r.title} className={`shadow-sm cursor-pointer transition-colors ${r.border}`} onClick={() => toast.info(`„${r.title}" — скоро`)}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><r.icon className={r.color} size={18} /> {r.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}