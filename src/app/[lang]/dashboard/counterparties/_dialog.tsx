'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TYPES = [
  { value: 'client', label: 'Клиент' },
  { value: 'supplier', label: 'Доставчик' },
  { value: 'both', label: 'Клиент и доставчик' },
];

interface CounterpartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: any;
  onSave: (data: any) => Promise<void> | void;
}

export function CounterpartyDialog({ open, onOpenChange, initial, onSave }: CounterpartyDialogProps) {
  const empty = { name: '', type: 'client', eik: '', vatNumber: '', address: '', city: '', contactPerson: '', phone: '', email: '' };
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(initial ? {
      name: initial.name || '',
      type: initial.type || 'client',
      eik: initial.eik || '',
      vatNumber: initial.vatNumber || '',
      address: initial.address || '',
      city: initial.city || '',
      contactPerson: initial.contactPerson || '',
      phone: initial.phone || '',
      email: initial.email || '',
    } : empty);
  }, [initial, open]);

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Редактиране на контрагент' : 'Нов контрагент'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Наименование *</label>
            <Input placeholder="ЕООД / АД / ФЛ" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Вид</label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none" value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
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
              <Input placeholder="ул. Примерна 1" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Град</label>
              <Input placeholder="София" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Лице за контакт</label>
              <Input placeholder="Иван Иванов" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Телефон</label>
              <Input placeholder="+359..." value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Имейл</label>
              <Input placeholder="info@..." value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отказ</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.name.trim()}>
              {loading ? 'Записва...' : (initial ? 'Запази' : 'Добави')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}