// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { getVatJournals, createVatJournal, deleteVatJournal } from './actions';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];
const VAT_RATES = [20, 9, 0];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AddEntryDialog({ type, year, month, onAdd }: { type: 'sales'|'purchases'; year: number; month: number; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ documentNumber: '', documentDate: new Date().toISOString().split('T')[0], counterpartyName: '', counterpartyVat: '', netAmount: '', vatRate: '20', vatAmount: '' });

  const set = (f: string, v: string) => {
    const next = { ...form, [f]: v };
    if (f === 'netAmount' || f === 'vatRate') {
      const net = parseFloat(f === 'netAmount' ? v : form.netAmount) || 0;
      const rate = parseFloat(f === 'vatRate' ? v : form.vatRate) || 0;
      next.vatAmount = (Math.round(net * rate / 100 * 100) / 100).toString();
    }
    setForm(next);
  };

  const handleSubmit = async () => {
    if (!form.documentNumber.trim()) { toast.error('Въведи номер на документ'); return; }
    if (!form.counterpartyName.trim()) { toast.error('Въведи контрагент'); return; }
    if (!form.netAmount || parseFloat(form.netAmount) <= 0) { toast.error('Въведи данъчна основа'); return; }
    setLoading(true);
    const res = await createVatJournal({ type: type === 'sales' ? 'sales' : 'purchase', periodYear: year, periodMonth: month, documentNumber: form.documentNumber, documentDate: form.documentDate, counterpartyName: form.counterpartyName, counterpartyVat: form.counterpartyVat, netAmount: parseFloat(form.netAmount), vatRate: parseFloat(form.vatRate), vatAmount: parseFloat(form.vatAmount) || 0 });
    if (res.success) {
      toast.success('Записано!'); onAdd(); setOpen(false);
      setForm({ documentNumber: '', documentDate: new Date().toISOString().split('T')[0], counterpartyName: '', counterpartyVat: '', netAmount: '', vatRate: '20', vatAmount: '' });
    } else toast.error('Грешка');
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus size={14} />Нов запис</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{type === 'sales' ? 'Дневник продажби' : 'Дневник покупки'} — нов запис</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Номер документ *</label><Input placeholder="0000000001" value={form.documentNumber} onChange={e => set('documentNumber', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Дата</label><Input type="date" value={form.documentDate} onChange={e => set('documentDate', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Контрагент *</label><Input placeholder="ЕООД / АД" value={form.counterpartyName} onChange={e => set('counterpartyName', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">ЕИК / ДДС №</label><Input placeholder="BG123456789" value={form.counterpartyVat} onChange={e => set('counterpartyVat', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Дан. основа *</label><Input type="number" min="0" step="0.01" placeholder="0.00" value={form.netAmount} onChange={e => set('netAmount', e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">ДДС %</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.vatRate} onChange={e => set('vatRate', e.target.value)}>
                {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium">ДДС сума</label><Input type="number" min="0" step="0.01" value={form.vatAmount} onChange={e => set('vatAmount', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Записва...' : 'Запиши'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JournalTab({ type, year, month }: { type: 'sales'|'purchases'; year: number; month: number }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await getVatJournals({ type: type === 'sales' ? 'sales' : 'purchase', year, month });
    if (res.success) setEntries((res as any).data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [type, year, month]);

  const handleDelete = async (id: string) => {
    if (!confirm('Изтриване?')) return;
    const res = await deleteVatJournal(id);
    if (res.success) { toast.success('Изтрито'); load(); } else toast.error('Грешка');
  };

  const totalNet = entries.reduce((s, e) => s + parseFloat(e.netAmount || '0'), 0);
  const totalVat = entries.reduce((s, e) => s + parseFloat(e.vatAmount || '0'), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Дан. основа: <strong className="text-foreground">{fmt(totalNet)} лв.</strong></span>
          <span className="text-muted-foreground">ДДС: <strong className="text-foreground">{fmt(totalVat)} лв.</strong></span>
          <span className="text-muted-foreground">Общо: <strong className="text-foreground">{fmt(totalNet + totalVat)} лв.</strong></span>
        </div>
        <AddEntryDialog type={type} year={year} month={month} onAdd={load} />
      </div>
      {loading ? (
        <div className="py-10 text-center text-muted-foreground text-sm">Зарежда...</div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-sm">Няма записи за периода.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead>Документ</TableHead><TableHead>Дата</TableHead><TableHead>Контрагент</TableHead>
              <TableHead>ЕИК/ДДС</TableHead><TableHead className="text-right">Дан. основа</TableHead>
              <TableHead className="text-right">ДДС %</TableHead><TableHead className="text-right">ДДС сума</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e: any) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">{e.documentNumber}</TableCell>
                  <TableCell className="text-sm">{new Date(e.documentDate).toLocaleDateString('bg-BG')}</TableCell>
                  <TableCell className="text-sm font-medium">{e.counterpartyName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.counterpartyVat || '—'}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(parseFloat(e.netAmount))} лв.</TableCell>
                  <TableCell className="text-right text-sm">{e.vatRate}%</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{fmt(parseFloat(e.vatAmount))} лв.</TableCell>
                  <TableCell><button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-rose-500 transition-colors p-1"><Trash2 size={13} /></button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function VatJournalsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ДДС Дневници</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Дневник на продажбите и покупките по ЗДДС</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-700 text-white rounded-2xl p-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><Receipt size={18} /></div>
            <div><p className="text-sm text-indigo-100">Период</p><p className="text-lg font-bold">{MONTHS[month - 1]} {year}</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><TrendingUp size={18} /></div>
            <div><p className="text-sm text-emerald-100">Продажби</p><p className="text-lg font-bold">ДДС за внасяне</p></div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl p-5 shadow-lg shadow-rose-200/60 dark:shadow-rose-900/40">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><TrendingDown size={18} /></div>
            <div><p className="text-sm text-rose-100">Покупки</p><p className="text-lg font-bold">ДДС за приспадане</p></div>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <Tabs defaultValue="sales">
            <TabsList className="mb-5">
              <TabsTrigger value="sales" className="gap-2"><TrendingUp size={14} />Продажби</TabsTrigger>
              <TabsTrigger value="purchases" className="gap-2"><TrendingDown size={14} />Покупки</TabsTrigger>
            </TabsList>
            <TabsContent value="sales"><JournalTab type="sales" year={year} month={month} /></TabsContent>
            <TabsContent value="purchases"><JournalTab type="purchases" year={year} month={month} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}