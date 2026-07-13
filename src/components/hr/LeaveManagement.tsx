'use client';

import { useState, useEffect, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, X, Plus, CalendarDays, Stethoscope, Umbrella, Clock, AlertCircle } from 'lucide-react';
import { getLeaveRequests, createLeaveRequest, approveLeaveRequest, rejectLeaveRequest, getEmployeesForSelect, getLeaveBalance } from '@/app/[lang]/dashboard/hr/leave-actions';

const TYPE_COLORS: Record<string, string> = {
  annual: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  sick:   'border-rose-500/30 text-rose-400 bg-rose-500/10',
  unpaid: 'border-slate-500/30 text-slate-400 bg-slate-500/10',
  other:  'border-violet-500/30 text-violet-400 bg-violet-500/10',
};
const TYPE_ICONS: Record<string, any> = {
  annual: Umbrella,
  sick:   Stethoscope,
  unpaid: CalendarDays,
  other:  CalendarDays,
};
const STATUS_COLORS: Record<string, string> = {
  pending:  'border-amber-500/30 text-amber-400 bg-amber-500/10',
  approved: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  rejected: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
};
const STATUS_LABELS: Record<string, string> = {
  pending:  'Чака одобрение',
  approved: 'Одобрен',
  rejected: 'Отхвърлен',
};

function daysBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

export function LeaveManagement() {
  const [leaves, setLeaves]         = useState<any[]>([]);
  const [emps, setEmps]             = useState<any[]>([]);
  const [balance, setBalance]       = useState<any[]>([]);
  const [filter, setFilter]         = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [tab, setTab]               = useState<'requests' | 'balance'>('requests');
  const [open, setOpen]             = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({ employeeId: '', startDate: '', endDate: '', type: 'annual', reason: '' });

  async function reload() {
    const [lr, er, br] = await Promise.all([getLeaveRequests(), getEmployeesForSelect(), getLeaveBalance()]);
    setLeaves(lr.data ?? []);
    setEmps(er.data ?? []);
    setBalance(br.data ?? []);
  }

  useEffect(() => { reload(); }, []);

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter);

  const stats = {
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    sick:     leaves.filter(l => l.type === 'sick' && l.status === 'approved').length,
    annual:   leaves.filter(l => l.type === 'annual' && l.status === 'approved').length,
  };

  function handleSubmit() {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      toast.error('Попълнете всички задължителни полета.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('Крайната дата не може да е преди началната.');
      return;
    }
    startTransition(async () => {
      const res = await createLeaveRequest(form as any);
      if (res.success) {
        toast.success('Заявката е подадена успешно!');
        setOpen(false);
        setForm({ employeeId: '', startDate: '', endDate: '', type: 'annual', reason: '' });
        await reload();
      } else {
        toast.error(res.error ?? 'Грешка при подаване.');
      }
    });
  }

  function handleApprove(id: string, employeeId: string, type: string) {
    startTransition(async () => {
      const res = await approveLeaveRequest(id, employeeId, type);
      if (res.success) { toast.success('Одобрено!'); await reload(); }
      else toast.error(res.error ?? 'Грешка');
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const res = await rejectLeaveRequest(id);
      if (res.success) { toast.success('Отхвърлено.'); await reload(); }
      else toast.error(res.error ?? 'Грешка');
    });
  }

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Чакат одобрение', value: stats.pending,  icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Одобрени',        value: stats.approved, icon: Check,         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'В болничен',       value: stats.sick,     icon: Stethoscope,   color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'В отпуск',         value: stats.annual,   icon: Umbrella,      color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.bg} p-5 flex items-center gap-4`}>
            <div className={`p-2.5 rounded-xl ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-xs text-zinc-400">{s.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('requests')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'requests' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>📋 Заявки</button>
        <button onClick={() => setTab('balance')}  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'balance'  ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>📊 Баланс</button>
      </div>

      {tab === 'balance' && (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h3 className="font-semibold text-white">Баланс отпуски {new Date().getFullYear()} г.</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Лимит: 20 дни платен отпуск/год. по Кодекса на труда</p>
          </div>
          {balance.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">Няма активни служители.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-xs text-zinc-500">
                  <th className="text-left px-6 py-3">Служител</th>
                  <th className="text-center px-4 py-3">Платен отпуск</th>
                  <th className="text-center px-4 py-3">Използван</th>
                  <th className="text-center px-4 py-3">Остатък</th>
                  <th className="text-center px-4 py-3">Болнични дни</th>
                  <th className="text-center px-4 py-3">Неплатен отп.</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((emp: any) => {
                  const pct = Math.min(100, Math.round((emp.annualUsed / emp.annualLimit) * 100));
                  const lowLeft = emp.annualLeft <= 5;
                  return (
                    <tr key={emp.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-200">{emp.firstName} {emp.lastName}</div>
                            <div className="text-xs text-zinc-500">{emp.position || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-zinc-300 font-medium">{emp.annualLimit} дни</span>
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className={`font-semibold tabular-nums ${emp.annualUsed > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{emp.annualUsed}</span>
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className={`font-bold tabular-nums ${lowLeft ? 'text-rose-400' : 'text-emerald-400'}`}>{emp.annualLeft}</span>
                        {lowLeft && <span className="ml-1 text-xs text-rose-500">⚠️</span>}
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className={`tabular-nums ${emp.sickDays > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>{emp.sickDays}</span>
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className={`tabular-nums ${emp.unpaidDays > 0 ? 'text-slate-400' : 'text-zinc-500'}`}>{emp.unpaidDays}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'requests' && (
      <>
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {f === 'all' ? 'Всички' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus size={15} /> Нова заявка
        </Button>
      </div>

      {/* Leave list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
            <CalendarDays size={36} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">Няма заявки за отпуск / болничен.</p>
          </div>
        ) : filtered.map(leave => {
          const TypeIcon = TYPE_ICONS[leave.type] ?? CalendarDays;
          const days = daysBetween(leave.startDate, leave.endDate);
          return (
            <div key={leave.id} className="bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-wrap items-center gap-4">
              {/* Employee */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                  {leave.firstName?.[0]}{leave.lastName?.[0]}
                </div>
                <div>
                  <div className="font-medium text-zinc-200 text-sm">{leave.firstName} {leave.lastName}</div>
                  <div className="text-xs text-zinc-500">{leave.position || '—'}</div>
                </div>
              </div>

              {/* Type */}
              <Badge variant="outline" className={`gap-1.5 ${TYPE_COLORS[leave.type]}`}>
                <TypeIcon size={11} /> {leave.typeLabel}
              </Badge>

              {/* Dates */}
              <div className="text-sm text-zinc-300">
                <span className="text-zinc-500 text-xs">от</span> {new Date(leave.startDate).toLocaleDateString('bg-BG')}
                <span className="text-zinc-500 text-xs mx-1">до</span> {new Date(leave.endDate).toLocaleDateString('bg-BG')}
                <span className="ml-2 text-xs text-zinc-500">({days} {days === 1 ? 'ден' : 'дни'})</span>
              </div>

              {/* Reason */}
              {leave.reason && (
                <div className="text-xs text-zinc-500 italic flex-1">„{leave.reason}"</div>
              )}

              {/* Status */}
              <Badge variant="outline" className={STATUS_COLORS[leave.status]}>
                {STATUS_LABELS[leave.status]}
              </Badge>

              {/* Actions */}
              {leave.status === 'pending' && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleApprove(leave.id, leave.employeeId, leave.type)}
                    className="h-8 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 gap-1.5"
                  >
                    <Check size={13} /> Одобри
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleReject(leave.id)}
                    variant="outline"
                    className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5"
                  >
                    <X size={13} /> Откажи
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New leave dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Нова заявка за отсъствие</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Employee */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Служител *</label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Изберете служител..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {emps.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-zinc-200 focus:bg-white/10">
                      {e.firstName} {e.lastName} {e.position ? `— ${e.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Вид *</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="annual"  className="text-zinc-200 focus:bg-white/10">🏖️ Платен отпуск</SelectItem>
                  <SelectItem value="sick"    className="text-zinc-200 focus:bg-white/10">🏥 Болничен</SelectItem>
                  <SelectItem value="unpaid"  className="text-zinc-200 focus:bg-white/10">📋 Неплатен отпуск</SelectItem>
                  <SelectItem value="other"   className="text-zinc-200 focus:bg-white/10">📌 Друг</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">От дата *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">До дата *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Days preview */}
            {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-indigo-300 flex items-center gap-2">
                <CalendarDays size={14} />
                {daysBetween(form.startDate, form.endDate)} работни {daysBetween(form.startDate, form.endDate) === 1 ? 'ден' : 'дни'}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Причина / забележка</label>
              <Textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="По желание..."
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 text-zinc-400">
              Отказ
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? 'Подаване...' : 'Подай заявка'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}
