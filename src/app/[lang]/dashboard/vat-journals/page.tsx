'use client';
import { useState, useEffect } from 'react';
import { getVatJournals, createVatJournal, deleteVatJournal } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [form, setForm] = useState({
    documentNumber: '', documentDate: new Date().toISOString().split('T')[0],
    counterpartyName: '', counterpartyVat: '', netAmount: '', vatRate: '20', vatAmount: '',
  });
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
    const res = await createVatJournal({
      type, periodYear: year, periodMonth: month,
      documentNumber: form.documentNumber, documentDate: form.documentDate,
      counterpartyName: form.counterpartyName, counterpartyVat: form.counterpartyVat,
      netAmount: parseFloat(form.netAmount), vatRate: parseFloat(form.vatRate),
      vatAmount: parseFloat(form.vatAmount) || 0,
    });
    if (res.success) { toast.success('Записано!'); onAdd(); setOpen(false); setForm({ documentNumber: '', documentDate: new Date().toISOString().split('T')[0], counterpartyName: '', counterpartyVat: '', netAmount: '', vatRate: '20', vatAmount: '' }); }
    else toast.error('Грешка: ' + res.error);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus size={14} /> Нов запис</Button>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ДДС %</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.vatRate} onChange={e => set('vatRate', e.target.value)}>
                {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium">ДДС сума</label><Input type="number" min="0" step="0.01" value={form.vatAmount} onChange={e => set('vatAmount', e.target.value)} /></div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Сума с ДДС:</span>
            <span className="font-mono font-semibold">{fmt((parseFloat(form.netAmount)||0) + (parseFloat(form.vatAmount)||0))} лв.</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Записване...' : 'Добави'}</Button>
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
    const res = await getVatJournals(type, year, month);
    if (res.success) setEntries(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [type, year, month]);

  const handleDelete = async (id: string) => {
    const res = await deleteVatJournal(id);
    if (res.success) { setEntries(p => p.filter(e => e.id !== id)); toast.success('Записът е изтрит.'); }
    else toast.error('Грешка: ' + res.error);
  };

  const totalNet = entries.reduce((s, e) => s + parseFloat(e.netAmount||'0'), 0);
  const totalVat = entries.reduce((s, e) => s + parseFloat(e.vatAmount||'0'), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Данъчна основа: <span className="font-mono font-semibold text-foreground">{fmt(totalNet)} лв.</span></span>
          <span className="text-muted-foreground">ДДС: <span className={`font-mono font-semibold ${type === 'sales' ? 'text-indigo-600' : 'text-amber-600'}`}>{fmt(totalVat)} лв.</span></span>
        </div>
        <AddEntryDialog type={type} year={year} month={month} onAdd={load} />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Receipt size={36} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Няма записи за {MONTHS[month-1]} {year}.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>№ Документ</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Контрагент</TableHead>
              <TableHead>ЕИК / ДДС №</TableHead>
              <TableHead className="text-right">Осн. (лв.)</TableHead>
              <TableHead className="text-right">ДДС %</TableHead>
              <TableHead className="text-right">ДДС (лв.)</TableHead>
              <TableHead className="text-right">Общо</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(e => {
              const net = parseFloat(e.netAmount||'0');
              const vat = parseFloat(e.vatAmount||'0');
              return (
                <TableRow key={e.id} className="group">
                  <TableCell className="font-mono text-sm">{e.documentNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.documentDate ? new Date(e.documentDate).toLocaleDateString('bg-BG') : '—'}</TableCell>
                  <TableCell className="font-medium">{e.counterpartyName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">{e.counterpartyVat || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(net)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{e.vatRate || 20}%</TableCell>
                  <TableCell className={`text-right font-mono ${type === 'sales' ? 'text-indigo-600' : 'text-amber-600'}`}>{fmt(vat)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(net + vat)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-rose