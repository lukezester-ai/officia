'use client';
import { useState, useEffect } from 'react';
import { getInvoices, getJournalEntries, createInvoice } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InvoiceDialog } from '@/components/dashboard/invoice-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, CheckCircle, Trash2, Download, Filter, FileSpreadsheet, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock Data
const initialInvoices = [
  { id: '1', invoiceNumber: 'INV-1001', clientName: 'TechCorp JS', amount: '2400.00', status: 'paid', issueDate: '2026-06-01', dueDate: '2026-06-15' },
  { id: '2', invoiceNumber: 'INV-1002', clientName: 'AgriNexus Ltd.', amount: '850.50', status: 'sent', issueDate: '2026-06-10', dueDate: '2026-06-24' },
  { id: '3', invoiceNumber: 'INV-1003', clientName: 'DevSolutions BG', amount: '1200.00', status: 'draft', issueDate: '2026-06-14', dueDate: '2026-06-28' },
];

const mockJournalEntries = [
  { id: 'JE-2026-001', date: '2026-06-15', docRef: 'INV-1002', description: 'Продажба на услуги', debitAcc: '411', creditAcc: '703', amount: '850.50', status: 'posted' },
  { id: 'JE-2026-002', date: '2026-06-16', docRef: 'BNK-099', description: 'Плащане от TechCorp', debitAcc: '503', creditAcc: '411', amount: '2400.00', status: 'posted' },
  { id: 'JE-2026-003', date: '2026-06-17', docRef: 'EXP-401', description: 'Наем офис', debitAcc: '602', creditAcc: '401', amount: '1200.00', status: 'draft' },
];

const mockLedger = [
  { id: '1', date: '2026-06-01', docRef: 'Начално салдо', description: 'Откриване на периода', debit: '-', credit: '-', balance: '15,000.00' },
  { id: '2', date: '2026-06-15', docRef: 'JE-2026-001', description: 'Фактура INV-1002', debit: '850.50', credit: '-', balance: '15,850.50' },
  { id: '3', date: '2026-06-16', docRef: 'JE-2026-002', description: 'Банков превод BNK-099', debit: '-', credit: '2,400.00', balance: '13,450.50' },
];

export default function AccountingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const invRes = await getInvoices();
      if (invRes.success && invRes.data) {
        setInvoices(invRes.data.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          amount: inv.amount,
          issueDate: new Date(inv.issueDate).toLocaleDateString(),
          dueDate: new Date(inv.dueDate).toLocaleDateString(),
          status: inv.status
        })));
      }

      const jrnlRes = await getJournalEntries();
      if (jrnlRes.success && jrnlRes.data) {
        setJournalEntries(jrnlRes.data.map((j: any) => ({
          id: j.journalNumber,
          date: new Date(j.entryDate).toLocaleDateString(),
          docRef: j.description,
          description: 'Автоматичен запис',
          debitAcc: '503',
          creditAcc: '411',
          amount: '2400.00',
          status: j.status
        })));
      }
    }
    loadData();
  }, []);

  const handleAddInvoice = async (newInvoice: any) => {
    // Optimistic UI update can be tricky with auto-generated IDs, so we wait for server
    const res = await createInvoice(newInvoice);
    if (res.success) {
      toast.success('Фактурата е създадена!');
      const inv = res.data;
      setInvoices([{
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        amount: inv.amount,
        issueDate: new Date(inv.issueDate).toLocaleDateString(),
        dueDate: new Date(inv.dueDate).toLocaleDateString(),
        status: inv.status
      }, ...invoices]);
    } else {
      toast.error('Грешка при запис: ' + res.error);
    }
  };

  const handleMarkPaid = async (id: string) => {
    // Optimistic update
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv));
    const { updateInvoiceStatus } = await import('./actions');
    const res = await updateInvoiceStatus(id, 'paid');
    if (res.success) {
      toast.success('Фактурата е маркирана като платена.');
    } else {
      toast.error('Грешка: ' + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setInvoices(invoices.filter(inv => inv.id !== id));
    const { deleteInvoice } = await import('./actions');
    const res = await deleteInvoice(id);
    if (res.success) {
      toast.info('Фактурата е изтрита.');
    } else {
      toast.error('Грешка при изтриване: ' + res.error);
    }
  };

  const handleExportExcel = () => {
    toast.info('Експортиране към Excel...');
    try {
      import('xlsx').then((xlsx) => {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(mockLedger.map(row => ({
          'Дата': row.date,
          'Основание': row.docRef,
          'Описание': row.description,
          'Дебит': row.debit,
          'Кредит': row.credit,
          'Салдо': row.balance
        })));
        xlsx.utils.book_append_sheet(wb, ws, "Главна книга");
        xlsx.writeFile(wb, "glavna_kniga.xlsx");
        toast.success('Експортът е успешен!');
      });
    } catch (err) {
      toast.error('Грешка при експортиране');
    }
  };

  const handleDownloadPDF = (inv: any) => {
    toast.success(`Изтегляне на ${inv.invoiceNumber} като PDF...`);
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-200 dark:border-emerald-800/50">Paid</Badge>;
      case 'sent': return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border-blue-200 dark:border-blue-800/50">Sent</Badge>;
      case 'overdue': return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border-red-200 dark:border-red-800/50">Overdue</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-600 dark:text-gray-400 hover:bg-gray-500/25 border-gray-200 dark:border-gray-800/50">Draft</Badge>;
    }
  };

  const getJournalStatusBadge = (status: string) => {
    switch (status) {
      case 'posted': return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">Публикувана</Badge>;
      case 'canceled': return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50">Сторнирана</Badge>;
      default: return <Badge className="bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800/50">Чернова</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D] dark:text-white">Счетоводство</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise модул за контрол на финансите и главна книга.</p>
        </div>
        <InvoiceDialog onAddInvoice={handleAddInvoice} />
      </div>

      <Tabs defaultValue="journal" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-gray-100 dark:bg-slate-800/50 p-1 rounded-xl">
          <TabsTrigger value="invoices" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Фактури</TabsTrigger>
          <TabsTrigger value="journal" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Журнал</TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Главна книга</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Отчети</TabsTrigger>
        </TabsList>

        {/* ТАБ: ФАКТУРИ */}
        <TabsContent value="invoices" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border-gray-100 dark:border-slate-800">
              <CardHeader className="py-4"><CardTitle className="text-sm text-gray-500">Неплатени (Outstanding)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-gray-900 dark:text-white">2,050.50 лв.</div></CardContent>
            </Card>
            <Card className="shadow-sm border-gray-100 dark:border-slate-800">
              <CardHeader className="py-4"><CardTitle className="text-sm text-gray-500">Платени този месец</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">2,400.00 лв.</div></CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-gray-100 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Издадени фактури</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Фактура</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Сума</TableHead>
                    <TableHead>Издадена</TableHead>
                    <TableHead>Падеж</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="group">
                      <TableCell className="font-medium text-[#0F1F3D] dark:text-white">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell>{inv.amount} лв.</TableCell>
                      <TableCell className="text-gray-500">{inv.issueDate}</TableCell>
                      <TableCell className="text-gray-500">{inv.dueDate}</TableCell>
                      <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleMarkPaid(inv.id)}>
                              <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Mark Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPDF(inv)}>
                              <FileText className="mr-2 h-4 w-4 text-blue-500" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ТАБ: ЖУРНАЛ */}
        <TabsContent value="journal" className="mt-6">
          <Card className="shadow-sm border-gray-100 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Хронологичен Журнал (Journal Entries)</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Списък на всички стопански операции.</p>
              </div>
              <Button variant="outline" className="gap-2 dark:border-slate-700">
                <Filter size={16} /> Филтри
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Документ</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-center">Дебит</TableHead>
                    <TableHead className="text-center">Кредит</TableHead>
                    <TableHead className="text-right">Сума (BGN)</TableHead>
                    <TableHead className="text-right">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-[#0F1F3D] dark:text-indigo-400">{entry.id}</TableCell>
                      <TableCell className="text-gray-500">{entry.date}</TableCell>
                      <TableCell>{entry.docRef}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-center font-mono bg-blue-50/30 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300">{entry.debitAcc}</TableCell>
                      <TableCell className="text-center font-mono bg-rose-50/30 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300">{entry.creditAcc}</TableCell>
                      <TableCell className="text-right font-medium">{entry.amount}</TableCell>
                      <TableCell className="text-right">{getJournalStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ТАБ: ГЛАВНА КНИГА */}
        <TabsContent value="ledger" className="mt-6">
          <Card className="shadow-sm border-gray-100 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-4">
              <div>
                <CardTitle>Главна книга (General Ledger)</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Справка за сметка: <strong className="text-indigo-600 dark:text-indigo-400">411 Клиенти</strong></p>
              </div>
              <Button variant="outline" className="gap-2 dark:border-slate-700" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} className="text-emerald-600" /> Експорт Excel
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Основание</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right text-blue-600 dark:text-blue-400">Дебит</TableHead>
                    <TableHead className="text-right text-rose-600 dark:text-rose-400">Кредит</TableHead>
                    <TableHead className="text-right font-bold">Салдо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-500">{row.date}</TableCell>
                      <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">{row.docRef}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">{row.debit}</TableCell>
                      <TableCell className="text-right text-rose-600 dark:text-rose-400">{row.credit}</TableCell>
                      <TableCell className="text-right font-bold text-[#0F1F3D] dark:text-white">{row.balance}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 dark:bg-slate-800/50">
                    <TableCell colSpan={3} className="font-bold text-right">Обороти за периода:</TableCell>
                    <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">850.50</TableCell>
                    <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">2,400.00</TableCell>
                    <TableCell className="text-right font-bold text-[#0F1F3D] dark:text-white">13,450.50</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ТАБ: ОТЧЕТИ */}
        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-gray-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => toast.success('Генериране на Оборотна ведомост...')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20} /> Оборотна ведомост
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Обороти и салда по всички сметки за избран период.</p>
              </CardHeader>
            </Card>
            <Card className="border-gray-200 dark:border-slate-800 shadow-sm hover:border-emerald-500 transition-colors cursor-pointer" onClick={() => toast.success('Генериране на ОПР...')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="text-emerald-600" size={20} /> Печалби и загуби (ОПР)
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Финансов резултат (Приходи срещу Разходи).</p>
              </CardHeader>
            </Card>
            <Card className="border-gray-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-colors cursor-pointer" onClick={() => toast.success('Генериране на Баланс...')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="text-blue-600" size={20} /> Счетоводен Баланс
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Състояние на Активи, Пасиви и Капитал.</p>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
