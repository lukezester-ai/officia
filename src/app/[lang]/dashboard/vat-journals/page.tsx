'use client';
import { useState, useEffect } from 'react';
import { getVatJournals, createVatEntry, deleteVatEntry, getVatSummary } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, TrendingUp, TrendingDown, FileSpreadsheet, Globe } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];
const CUR_YEAR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;
const VAT_RATES = [20, 9, 0];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyForm(type: 'sales' | 'purchases', year: number, month: number) {
  return {
    type, periodYear: year, periodMonth: month,
    entryDate: new Date().toISOString().split('T')[0],
    counterpartyName: '', counterpartyVat: '',
    invoiceNumber: '', invoiceDate: '',
    netAmount: '', vatRate: 20, isIntraCommunity: false,
  };
}

function AddEntryDialog({ type, year, month, onAdd }: { type: 'sales' | 'purchases'; year: number; month: number; onAdd: (entry: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm(type, year, month));
  const [loading, setLoading] = useState(false);

  const vatAmount = Math.round((parseFloat(form.netAmount) || 0) * (form.vatRate / 100) * 100) / 100;
  const totalAmount = (parseFloat(form.netAmount) || 0) + vatAmount;
  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.counterpartyName.trim()) { toast.error('Въведи контрагент'); return; }
    if (!form.netAmount || parseFloat(form.netAmount) <= 0) { toast.error('Въведи данъчна основа'); return; }
    setLoading(true);
    await onAdd({ ...form, netAmount: parseFloat(form.netAmount), vatRate: Number(form.vatRate) });
    setOpen(false);
    setForm(emptyForm(type, year, month));
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" size="sm"><Plus size={14} /> Нов запис</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{type === 'sales' ? 'Нова продажба' : 'Нова покупка'} — {MONTHS[month - 1]} {year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Контрагент *</label>
              <Input placeholder="Фирма ООД" value={form.counterpartyName} onChange={e => set('counterpartyName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ДДС номер</label>
              <Input placeholder="BG123456789" value={form.counterpartyVat} onChange={e => set('counterpartyVat', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Фактура №</label>
              <Input placeholder="1000000001" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Дата фактура</label>
              <Input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Данъчна основа (BGN) *</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.netAmount} onChange={e => set('netAmount', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ДДС ставка</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.vatRate} onChange={e => set('vatRate', Number(e.target.value))}>
                {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Данъчна основа:</span><span className="font-mono">{fmt(parseFloat(form.netAmount) || 0)} лв.</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ДДС {form.vatRate}%:</span><span className="font-mono text-amber-600">{fmt(vatAmount)} лв.</span></div>
            <div className="flex justify-between font-medium border-t pt-1.5"><span>Общо с ДДС:</span><span className="font-mono">{fmt(totalAmount)} лв.</span></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="intra" checked={form.isIntraCommunity} onChange={e => set('isIntraCommunity', e.target.checked)} className="rounded" />
            <label htmlFor="intra" className="text-sm flex items-center gap-1.5"><Globe size={13} className="text-blue-500" /> Вътреобщностна сделка (ВОД/ВОП)</label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Записване...' : 'Запази'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JournalTable({ type, year, month }: { type: 'sales' | 'purchases'; year: number; month: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVatJournals(type, year, month).then(res => { if (res.success) setRows(res.data); setLoading(false); });
  }, [type, year, month]);

  const handleAdd = async (entry: any) => {
    const res = await createVatEntry(entry);
    if (res.success && res.data) { setRows(prev => [res.data, ...prev]); toast.success('Записът е добавен!'); }
    else toast.error('Грешка: ' + res.error);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteVatEntry(id);
    if (res.success) { setRows(prev => prev.filter(r => r.id !== id)); toast.success('Изтрито.'); }
    else toast.error('Грешка: ' + res.error);
  };

  const netTotal = rows.reduce((s, r) => s + parseFloat(r.netAmount || '0'), 0);
  const vatTotal = rows.reduce((s, r) => s + parseFloat(r.vatAmount || '0'), 0);
  const totalTotal = rows.reduce((s, r) => s + parseFloat(r.totalAmount || '0'), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rows.length} записа за {MONTHS[month - 1]} {year}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info('Excel скоро...')}><FileSpreadsheet size={14} /> Excel</Button>
          <AddEntryDialog type={type} year={year} month={month} onAdd={handleAdd} />
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Няма записи за {MONTHS[month - 1]} {year}.<br />Добави нов запис с бутона горе.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Контрагент</TableHead>
                <TableHead>ДДС №</TableHead>
                <TableHead>Фактура</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Осн. BGN</TableHead>
                <TableHead className="text-right">Ставка</TableHead>
                <TableHead className="text-right">ДДС BGN</TableHead>
                <TableHead className="text-right">Общо</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: any) => (
                <TableRow key={row.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {row.isIntraCommunity && <Globe size={12} className="text-blue-500 shrink-0" />}
                      {row.counterpartyName || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{row.counterpartyVat || '—'}</TableCell>
                  <TableCell className="text-sm">{row.invoiceNumber || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.entryDate ? new Date(row.entryDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(parseFloat(row.netAmount || '0'))}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={`text-xs ${row.vatRate === 20 ? 'bg-amber-50 text-amber-700 border-amber-200' : row.vatRate === 9 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {row.vatRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-700">{fmt(parseFloat(row.vatAmount || '0'))}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{fmt(parseFloat(row.totalAmount || '0'))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(row.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4} className="text-right text-sm">Общо за периода:</TableCell>
                <TableCell className="text-right font-mono">{fmt(netTotal)}</TableCell>
                <TableCell />
                <TableCell className="text-right font-mono text-amber-700">{fmt(vatTotal)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(totalTotal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function VatJournalsPage() {
  const [year, setYear] = useState(CUR_YEAR);
  const [month, setMonth] = useState(CUR_MONTH);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getVatSummary(year, month).then(res => { if (res.success) setSummary(res.data); });
  }, [year, month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ДДС Дневници</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Дневник продажби и дневник покупки по ЗДДС.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-600" /> Продажби — осн.</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{fmt(summary.sales.netTotal)} лв.</div><div className="text-xs text-muted-foreground">{summary.sales.count} фактури</div></CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingUp size={13} className="text-amber-600" /> ДДС продажби</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-amber-600">{fmt(summary.sales.vatTotal)} лв.</div></CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><TrendingDown size={13} className="text-blue-600" /> Покупки — осн.</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{fmt(summary.purchases.netTotal)} лв.</div><div className="text-xs text-muted-foreground">{summary.purchases.count} фактури</div></CardContent>
          </Card>
          <Card className={`shadow-sm ${summary.vatPayable > 0 ? 'border-rose-200' : 'border-emerald-200'}`}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{summary.vatPayable > 0 ? 'ДДС за внасяне' : 'ДДС за възстан.'}</CardTitle></CardHeader>
            <CardContent><div className={`text-xl font-bold ${summary.vatPayable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(summary.vatPayable > 0 ? summary.vatPayable : summary.vatRefundable)} лв.</div></CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="sales">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="sales">Дн. продажби</TabsTrigger>
          <TabsTrigger value="purchases">Дн. покупки</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><TrendingUp size={18} /> Дневник продажби — {MONTHS[month - 1]} {year}</CardTitle>
              <p className="text-sm text-muted-foreground">Издадени фактури с начислен ДДС (изходящ)</p>
            </CardHeader>
            <CardContent className="pt-5"><JournalTable type="sales" year={year} month={month} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="purchases" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400"><TrendingDown size={18} /> Дневник покупки — {MONTHS[month - 1]} {year}</CardTitle>
              <p className="text-sm text-muted-foreground">Получени фактури с право на данъчен кредит (входящ)</p>
            </CardHeader>
            <CardContent className="pt-5"><JournalTable type="purchases" year={year} month={month} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}