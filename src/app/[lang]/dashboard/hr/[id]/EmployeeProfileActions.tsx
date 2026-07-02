'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Edit, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createEmploymentContract, updateEmployee } from '../actions';

type EmployeeView = {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
  address: string | null; position: string | null; department: string | null; salary: string | null; bankName: string | null;
};

export function EmployeeProfileActions({ employee }: { employee: EmployeeView }) {
  return <div className="ml-auto flex gap-2"><EditEmployeeDialog employee={employee} /><ContractDialog employeeId={employee.id} /></div>;
}

function EditEmployeeDialog({ employee }: { employee: EmployeeView }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: `${employee.firstName} ${employee.lastName}`.trim(), email: employee.email || '', phone: employee.phone || '',
    address: employee.address || '', position: employee.position || '', department: employee.department || '',
    salary: employee.salary || '', bankName: employee.bankName || '', personalIdentifier: '', bankIban: '',
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    const result = await updateEmployee(employee.id, form);
    setSaving(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Данните на служителя са обновени.');
    setOpen(false);
    window.location.reload();
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="gap-2"><Edit size={16} />Редактирай</Button></DialogTrigger>
    <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Редакция на служител</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Имена" value={form.name} onChange={(v) => set('name', v)} />
        <Field label="Имейл" value={form.email} onChange={(v) => set('email', v)} type="email" />
        <Field label="Телефон" value={form.phone} onChange={(v) => set('phone', v)} />
        <Field label="Адрес" value={form.address} onChange={(v) => set('address', v)} />
        <Field label="Длъжност" value={form.position} onChange={(v) => set('position', v)} />
        <Field label="Отдел" value={form.department} onChange={(v) => set('department', v)} />
        <Field label="Основна заплата (€)" value={form.salary} onChange={(v) => set('salary', v)} type="number" />
        <Field label="Банка" value={form.bankName} onChange={(v) => set('bankName', v)} />
        <Field label="Ново ЕГН/ЛНЧ (оставете празно без промяна)" value={form.personalIdentifier} onChange={(v) => set('personalIdentifier', v)} />
        <Field label="Нов IBAN (оставете празно без промяна)" value={form.bankIban} onChange={(v) => set('bankIban', v)} />
      </div>
      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Запазване...' : 'Запази'}</Button></div>
    </DialogContent>
  </Dialog>;
}

function ContractDialog({ employeeId }: { employeeId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ contractNumber: '', kind: 'permanent' as 'permanent' | 'fixed_term' | 'civil_contract', contractDate: today, startDate: today, endDate: '' });
  const save = async () => {
    setSaving(true);
    const result = await createEmploymentContract(employeeId, form);
    setSaving(false);
    if (!result.success) return toast.error(result.error);
    toast.success('Договорът е добавен.'); setOpen(false); window.location.reload();
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="gap-2"><FilePlus size={16} />Нов договор</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Нов трудов договор</DialogTitle></DialogHeader>
      <Field label="Номер" value={form.contractNumber} onChange={(v) => setForm({ ...form, contractNumber: v })} />
      <label className="space-y-1 text-sm">Вид<select className="h-9 w-full rounded-lg border bg-background px-3" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}><option value="permanent">Безсрочен</option><option value="fixed_term">Срочен</option><option value="civil_contract">Граждански</option></select></label>
      <Field label="Дата на договора" value={form.contractDate} onChange={(v) => setForm({ ...form, contractDate: v })} type="date" />
      <Field label="Начална дата" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} type="date" />
      {form.kind !== 'permanent' && <Field label="Крайна дата" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} type="date" />}
      <div className="flex justify-end"><Button onClick={save} disabled={saving || !form.contractNumber}>{saving ? 'Запазване...' : 'Добави договор'}</Button></div>
    </DialogContent>
  </Dialog>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-1 text-sm"><span>{label}</span><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
