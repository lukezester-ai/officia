// @ts-nocheck
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export function InvoiceDialog({ onAddInvoice }: { onAddInvoice: (invoice: any) => void }) {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !amount || !dueDate) return;

    onAddInvoice({
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName,
      amount: parseFloat(amount).toFixed(2),
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
    });

    setClientName('');
    setAmount('');
    setDueDate('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#4F46E5] hover:bg-[#4338CA] gap-2 shadow-sm">
          <Plus size={16} /> Нова Фактура
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Създаване на фактура</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Име на клиент</label>
            <Input 
              placeholder="Име на фирма ООД" 
              value={clientName} 
              onChange={(e) => setClientName(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Сума (BGN)</label>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Краен срок (Падеж)</label>
            <Input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)} 
            />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Запис на фактура
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
