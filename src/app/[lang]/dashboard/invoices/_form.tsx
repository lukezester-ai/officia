'use client';
import { useState, useEffect } from 'react';
import { createInvoice, getCounterpartiesForSelect } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const VAT_RATES = [20, 9, 0];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyLine = () => ({ description: '', quantity: '1', unitPrice: '', vatRate: 20 });

export function NewInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [form, setForm] = useState({
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    counterpartyName: '',
    counterpartyEik: '',
    counterpartyVat: '',
    counterpartyAddress: '',
    notes: '',
  });
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(() => {
    if (open) getCounterpartiesForSelect().then(r => { if (r.success) setClients(r.data); });
  }, [open]);

  const setF = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const handleClientSelect = (id: string) => {
    setSelectedClient(id);
    const c = clients.find(x => x.id === id);
    if (c) setForm(p => ({ ...p, counterpartyName: c.name, counterpartyEik: c.eik||'', counterpartyVat: c.vatNumber||'', counterpartyAddress: c.address ? `${c.address}, ${c.city||''}` : '' }));
  };

  const setLine = (i: number, f: string, v: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  };

  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));

  const computedLines = lines.map(l => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    const net = Math.round(qty * price * 100) / 100;
    const vat = Math.round(net * l.vatRate / 100 * 100) / 100;
    return { ...l, net, vat, total: net + vat };
  });

  const totals = computedLines.reduce((acc, l) => ({ net: acc.net + l.net, vat: acc.vat + l.vat, total: acc.total + l.total }), { net: 0, vat: 0, total: 0 });

  const handleSubmit = async () => {
    if (!form.invoiceNumber.trim()) { toast.error('Въведи номер на фактура'); return; }
    if (!form.counterpartyName.trim()) { toast.error('Избери или въведи клиент'); return; }
    if (lines.every(l => !l.description.trim())) { toast.error('Добави поне един ред'); return; }
    setLoading(true);
    const res = await createInvoice({
      ...form,
      lines: computedLines.filter(l => l.description.trim()).map(l => ({
        description: l.description,
        quantity: parseFloat(l.quantity) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
        vatRate: l.vatRate,
      })),
    });
    if (res.success) {
      toast.success('Фактурата е създадена!');
      onCreated();
      setOpen(false);
      setForm({ invoiceNumber: '', issueDate: new Date().toISOString().split('T')[0], dueDate: '', counterpartyName: '', counterparty