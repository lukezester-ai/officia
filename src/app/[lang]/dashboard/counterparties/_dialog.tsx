'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const TYPES = [
  { value: 'client', label: 'Клиент' },
  { value: 'supplier', label: 'Доставчик' },
  { value: 'both', label: 'Клиент и доставчик' },
];

const emptyForm = {
  type: 'client', name: '', eik: '', vatNumber: '',
  address: '', city: '', email: '', phone: '', contactPerson: '', notes: '',
};

export function CounterpartyDialog({ initial, onSave, trigger }: {
  initial?: any; onSave: (data: any) => Promise<void>; trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initial || emptyForm);
  const set = (f: string, v: string) => setForm((p: any) => ({ ...p, [f]: v }));

  useEffect(() => { if (open) setForm(initial || emptyForm); }, [open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Въведи наименование'); return; }
    setLoading(true);
    await onSave(form);
    setOpen(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Редактиране' : 'Нов контрагент'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Тип *</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Наименование *</label>
              <Input placeholder="Фирма ЕООД" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ЕИК</label>
              <Input placeholder="123456789" value={form.eik} onChange={e => set('eik', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ДДС №</label>
              <Input placeholder="BG123456789" value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Адрес</label>
              <Input placeholder="ул. Витоша 1" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Град</label>
              <Input placeholder="София" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Имейл</label>
              <Input type="email" placeholder="office@firma.bg" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Телефон</label>
              <Input placeholder="+359 88 123 4567" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">МОЛ</label>
              <Input placeholder="Иван Иванов" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Бележки</label>
              <Input placeholder="..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Записване...' : initial ? 'Запази' : 'Добави'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}