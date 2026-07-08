'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createLeaveRequest } from './actions';

const leaveTypes = [
  { value: 'annual', label: 'Платен отпуск' },
  { value: 'sick', label: 'Болничен' },
  { value: 'unpaid', label: 'Неплатен отпуск' },
  { value: 'maternity', label: 'Майчинство' },
  { value: 'parental', label: 'Родителски отпуск' },
  { value: 'other', label: 'Друг' },
] as const;

export function LeaveRequestDialog({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'annual' as string, startDate: '', endDate: '', reason: '' });

  const save = async () => {
    if (!form.startDate || !form.endDate) return toast.error('Изберете начална и крайна дата.');
    if (form.endDate < form.startDate) return toast.error('Крайната дата трябва да е след началната.');

    setSaving(true);
    const result = await createLeaveRequest({
      employeeId, type: form.type as any, startDate: form.startDate, endDate: form.endDate, reason: form.reason || undefined,
    });
    setSaving(false);

    if (!result.success) return toast.error(result.error);
    toast.success('Заявката за отпуск е подадена.');
    setOpen(false);
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2" variant="outline">
          <CalendarPlus size={16} /> Нов отпуск
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Нова заявка за отпуск</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="space-y-1 text-sm">
            <span>Тип отпуск</span>
            <select className="h-9 w-full rounded-lg border bg-background px-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {leaveTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Начална дата" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} type="date" />
            <Field label="Крайна дата" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} type="date" />
          </div>
          <label className="space-y-1 text-sm">
            <span>Причина (опционално)</span>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
          </label>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
              Изпрати заявка
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="space-y-1 text-sm"><span>{label}</span><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
