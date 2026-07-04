'use client';
import { useState, useEffect } from 'react';
import { createPurchaseInvoice, getSuppliersForSelect } from './actions-read';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Bot, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseInvoiceLines } from './_form-lines';

const freshForm = () => ({
  invoiceNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  supplierName: '',
  supplierEik: '',
  supplierVat: '',
  supplierAddress: '',
  notes: '',
});
const emptyLine = () => ({ description: '', quantity: '1', unitPrice: '', vatRate: 20 });
function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function NewPurchaseInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAiAutoFill = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        setForm(p => ({
          ...p,
          invoiceNumber: data.invoiceNumber || p.invoiceNumber,
          issueDate: data.issueDate || p.issueDate,
          supplierName: data.supplierName || p.supplierName,
          supplierEik: data.supplierEik || p.supplierEik,
          supplierVat: data.supplierVat || p.supplierVat,
          notes: data.notes || p.notes
        }));
        if (data.lines && data.lines.length > 0) {
          setLines(data.lines.map((l: { description: string; quantity: number; unitPrice: number; vatRate: number }) => ({
            description: l.description,
            quantity: String(l.quantity),
            unitPrice: String(l.unitPrice),
            vatRate: l.vatRate
          })));
        }
        toast.success('AI попълни данните успешно!');
      } else {
        toast.error('Грешка при AI анализа');
      }
    } catch (e) {
      toast.error('Сървърна грешка при връзка с AI');
    }
    setLoadingAi(false);
  };
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [form, setForm] = useState(freshForm());
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(() => {
    if (open) getSuppliersForSelect().then(r => { if (r.success) setSuppliers(r.data); });
  }, [open]);

  const setF = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const handleSupplierSelect = (id: string) => {
    setSelectedSupplier(id);
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    setForm(p => ({
      ...p,
      supplierName: s.name,
      supplierEik: s.eik || '',
      supplierVat: s.vatNumber || '',
      supplierAddress: s.address ? `${s.address}, ${s.city || ''}` : '',
    }));
  };

  const setLine = (i: number, f: string, v: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [f]: v } : l));

  const computedLines = lines.map(l => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    const net = Math.round(qty * price * 100) / 100;
    const vat = Math.round(net * l.vatRate / 100 * 100) / 100;
    return { ...l, net, vat, total: net + vat };
  });
  const totals = computedLines.reduce(
    (acc, l) => ({ net: acc.net + l.net, vat: acc.vat + l.vat, total: acc.total + l.total }),
    { net: 0, vat: 0, total: 0 }
  );

  const handleSubmit = async () => {
    if (!form.invoiceNumber.trim()) { toast.error('Въведи номер на фактура'); return; }
    if (!form.supplierName.trim()) { toast.error('Въведи доставчик'); return; }
    if (lines.every(l => !l.description.trim())) { toast.error('Добави поне един ред'); return; }
    setLoading(true);
    const res = await createPurchaseInvoice({
      ...form,
      lines: computedLines.filter(l => l.description.trim()).map(l => ({
        description: l.description,
        quantity: parseFloat(l.quantity) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
        vatRate: l.vatRate,
      })),
    });
    if (res.success) {
      toast.success('Фактурата е записана!');
      onCreated(); setOpen(false); setForm(freshForm()); setLines([emptyLine()]); setSelectedSupplier('');
    } else { toast.error('Грешка: ' + res.error); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus size={15} /> Нова покупна фактура</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Нова покупна фактура</DialogTitle></DialogHeader>
        <div className="space-y-5 pt-2">
          
          {/* AI Auto-fill section */}
          <div className="flex gap-2 items-center bg-[#4F46E5]/5 p-3 rounded-xl border border-[#4F46E5]/20">
            <div className="h-8 w-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
              <Bot size={18} className="text-[#4F46E5]" />
            </div>
            <Input 
              placeholder="Постави текст от фактура или напиши 'Фактура от Еконт за 50€'..." 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className="bg-white border-white focus-visible:ring-[#4F46E5]/30 shadow-sm"
              disabled={loadingAi}
            />
            <Button 
              variant="default" 
              className="bg-[#4F46E5] hover:bg-[#4338CA] whitespace-nowrap shadow-sm"
              onClick={handleAiAutoFill}
              disabled={loadingAi || !aiPrompt.trim()}
            >
              <Sparkles size={16} className="mr-2" />
              {loadingAi ? 'Анализ...' : 'AI Попъ€ане'}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Номер *</label>
              <Input placeholder="0000000001" value={form.invoiceNumber} onChange={e => setF('invoiceNumber', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Дата</label>
              <Input type="date" value={form.issueDate} onChange={e => setF('issueDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Падеж</label>
              <Input type="date" value={form.dueDate} onChange={e => setF('dueDate', e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold">Доставчик</p>
            {suppliers.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Избери от регистъра</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none"
                  value={selectedSupplier}
                  onChange={e => handleSupplierSelect(e.target.value)}
                >
                  <option value="">— изберете —</option>
                  {suppliers
                    .filter(s => s.type === 'supplier' || s.type === 'both')
                    .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Наименование *</label>
                <Input placeholder="Доставчик ЕООД" value={form.supplierName} onChange={e => setF('supplierName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Адрес</label>
                <Input placeholder="гр. София, ул. ..." value={form.supplierAddress} onChange={e => setF('supplierAddress', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ЕИК</label>
                <Input placeholder="123456789" value={form.supplierEik} onChange={e => setF('supplierEik', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ДДС №</label>
                <Input placeholder="BG123456789" value={form.supplierVat} onChange={e => setF('supplierVat', e.target.value)} />
              </div>
            </div>
          </div>
          <PurchaseInvoiceLines
            lines={lines}
            computedLines={computedLines}
            onAdd={() => setLines(p => [...p, emptyLine()])}
            onRemove={i => setLines(p => p.filter((_, idx) => idx !== i))}
            onChange={setLine}
          />
          <div className="rounded-lg bg-muted/50 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Данъчна основа:</span>
              <span className="font-mono">{fmt(totals.net)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ДДС:</span>
              <span className="font-mono text-indigo-600">{fmt(totals.vat)} €</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-1.5 mt-1.5">
              <span>Сума за плащане:</span>
              <span className="font-mono">{fmt(totals.total)} €</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Забележки</label>
            <Input placeholder="Допълнителна информация..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Записване...' : 'Запиши фактура'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
