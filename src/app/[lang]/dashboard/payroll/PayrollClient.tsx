'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Calculator, CheckCircle, Landmark, Save, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculatePayrollRow, payrollTotals, type PayrollInput, type PayrollRates } from '@/lib/payroll/calculator';
import { postPayroll, savePayrollDraft } from './actions';
import { PayrollExportButton } from './PayrollExportButton';

type Row = ReturnType<typeof calculatePayrollRow>;
type HistoryItem = { id: string; month: string; status: 'draft' | 'posted' | 'canceled' };
type PayrollData = {
  batchId: string | null;
  month: string;
  status: 'new' | 'draft' | 'posted' | 'canceled';
  journalHeaderId: string | null;
  rates: PayrollRates;
  list: Row[];
  totals: ReturnType<typeof payrollTotals>;
  history: HistoryItem[];
};

const fmt = (value: number) => value.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const numeric = (value: string) => Number(value.replace(',', '.')) || 0;

export function PayrollClient({ initial }: { initial: PayrollData }) {
  const router = useRouter();
  const [month, setMonth] = useState(initial.month);
  const [rates, setRates] = useState(initial.rates);
  const [inputs, setInputs] = useState<PayrollInput[]>(initial.list.map((row) => ({
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    position: row.position,
    baseSalary: row.baseSalary,
    workingDays: row.workingDays,
    workedDays: row.workedDays,
    bonus: row.bonus,
    otherTaxable: row.otherTaxable,
    otherDeductions: row.otherDeductions,
  })));
  const [pending, setPending] = useState<'save' | 'post' | null>(null);
  const locked = initial.status === 'posted';
  const rows = useMemo(() => inputs.map((row) => calculatePayrollRow(row, rates)), [inputs, rates]);
  const totals = useMemo(() => payrollTotals(rows), [rows]);

  const updateRow = (employeeId: string, field: keyof PayrollInput, value: number) => {
    setInputs((current) => current.map((row) => row.employeeId === employeeId ? { ...row, [field]: value } : row));
  };
  const updateRate = (field: keyof PayrollRates, value: number) => setRates((current) => ({ ...current, [field]: value }));
  const openMonth = (value: string) => {
    setMonth(value);
    router.push(`/bg/dashboard/payroll?month=${value}`);
  };

  const save = async () => {
    setPending('save');
    const result = await savePayrollDraft({ month, rates, rows: inputs });
    setPending(null);
    if (!result.success) return toast.error(result.error);
    toast.success('Ведомостта е записана като чернова.');
    router.refresh();
    return result.batchId;
  };

  const post = async () => {
    if (!window.confirm('Да се заключи и осчетоводи ведомостта? След това няма да може да се редактира.')) return;
    setPending('post');
    let batchId = initial.batchId;
    if (!batchId || initial.status === 'new') {
      const saved = await savePayrollDraft({ month, rates, rows: inputs });
      if (!saved.success) {
        setPending(null);
        return toast.error(saved.error);
      }
      batchId = saved.batchId;
    }
    const result = await postPayroll(batchId);
    setPending(null);
    if (!result.success) return toast.error(result.error);
    toast.success(`Ведомостта е осчетоводена: ${result.journalNumber}`);
    router.refresh();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Работни заплати (ТРЗ)</h1>
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${locked ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300' : 'border-amber-500/30 bg-amber-500/20 text-amber-300'}`}>
              {locked ? 'Осчетоводена' : initial.status === 'draft' ? 'Чернова' : 'Нова'}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">Месечна ведомост, удръжки, работодателски осигуровки и счетоводно приключване.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(event) => openMonth(event.target.value)} className="w-40 bg-white/5" />
          <PayrollExportButton month={month} rows={rows} />
          {!locked && <Button variant="outline" onClick={save} disabled={pending !== null || rows.length === 0} className="gap-2"><Save size={16} />{pending === 'save' ? 'Записване...' : 'Запиши чернова'}</Button>}
          {!locked && <Button onClick={post} disabled={pending !== null || rows.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><CheckCircle size={16} />{pending === 'post' ? 'Осчетоводяване...' : 'Потвърди и осчетоводи'}</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard icon={<Users size={15} />} label="Служители" value={String(rows.length)} />
        <SummaryCard icon={<Wallet size={15} />} label="Брутни заплати" value={fmt(totals.gross)} />
        <SummaryCard icon={<Landmark size={15} />} label="Осигуровки и данък" value={fmt(totals.employeeInsurance + totals.employerInsurance + totals.tax)} />
        <SummaryCard icon={<Calculator size={15} />} label="Общ разход за работодателя" value={fmt(totals.employerCost)} />
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader><CardTitle className="text-base text-white">Параметри на изчислението</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <RateInput label="Максимален осигурителен доход" value={rates.maxInsuranceBase} onChange={(value) => updateRate('maxInsuranceBase', value)} disabled={locked} suffix="€" />
          <RateInput label="Лични осигуровки" value={rates.employeeInsuranceRate} onChange={(value) => updateRate('employeeInsuranceRate', value)} disabled={locked} suffix="%" />
          <RateInput label="Осигуровки работодател" value={rates.employerInsuranceRate} onChange={(value) => updateRate('employerInsuranceRate', value)} disabled={locked} suffix="%" />
          <RateInput label="Данък върху дохода" value={rates.incomeTaxRate} onChange={(value) => updateRate('incomeTaxRate', value)} disabled={locked} suffix="%" />
          <p className="col-span-full text-xs text-zinc-500">Стандартни параметри за трета категория труд през 2026 г. Работодателската ставка включва примерен риск ТЗПБ 0,50%; настройте я според икономическата дейност.</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-white/5">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="min-w-52 pl-6">Служител</TableHead><TableHead>Основна</TableHead><TableHead>Работни дни</TableHead><TableHead>Отработени</TableHead><TableHead>Бонус</TableHead><TableHead>Друг облагаем</TableHead><TableHead>Други удръжки</TableHead><TableHead className="text-right">Брутно</TableHead><TableHead className="text-right">Лични осиг.</TableHead><TableHead className="text-right">Данък</TableHead><TableHead className="text-right pr-6">Нетно</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => <TableRow key={row.employeeId} className="border-white/10">
                <TableCell className="pl-6"><div className="font-medium text-zinc-100">{row.employeeName}</div><div className="text-xs text-zinc-500">{row.position || 'Без длъжност'}</div>{row.warning && <div className="mt-1 flex items-start gap-1 text-xs text-amber-400"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{row.warning}</div>}</TableCell>
                <EditableMoney value={row.baseSalary} onChange={(value) => updateRow(row.employeeId, 'baseSalary', value)} disabled={locked} />
                <EditableNumber value={row.workingDays} onChange={(value) => updateRow(row.employeeId, 'workingDays', value)} disabled={locked} />
                <EditableNumber value={row.workedDays} onChange={(value) => updateRow(row.employeeId, 'workedDays', value)} disabled={locked} />
                <EditableMoney value={row.bonus} onChange={(value) => updateRow(row.employeeId, 'bonus', value)} disabled={locked} />
                <EditableMoney value={row.otherTaxable} onChange={(value) => updateRow(row.employeeId, 'otherTaxable', value)} disabled={locked} />
                <EditableMoney value={row.otherDeductions} onChange={(value) => updateRow(row.employeeId, 'otherDeductions', value)} disabled={locked} />
                <TableCell className="text-right font-medium text-violet-300">{fmt(row.gross)}</TableCell>
                <TableCell className="text-right text-zinc-400">{fmt(row.employeeInsurance)}</TableCell>
                <TableCell className="text-right text-rose-300">{fmt(row.incomeTax)}</TableCell>
                <TableCell className="text-right pr-6 font-bold text-emerald-400">{fmt(row.net)}</TableCell>
              </TableRow>)}
              {rows.length === 0 && <TableRow><TableCell colSpan={11} className="py-16 text-center text-zinc-500">Няма активни служители. Добавете служител от раздел „Човешки ресурси“.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {initial.history.length > 0 && <Card className="border-white/10 bg-white/5"><CardHeader><CardTitle className="text-base text-white">Последни ведомости</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{initial.history.map((item) => <Button key={item.id} variant="outline" size="sm" onClick={() => openMonth(item.month.slice(0, 7))}>{item.month.slice(0, 7)} · {item.status === 'posted' ? 'осчетоводена' : 'чернова'}</Button>)}</CardContent></Card>}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card className="border-white/10 bg-white/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">{icon}{label}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-white tabular-nums">{value}</div></CardContent></Card>;
}
function RateInput({ label, value, onChange, disabled, suffix }: { label: string; value: number; onChange: (value: number) => void; disabled: boolean; suffix: string }) {
  return <label className="space-y-1 text-xs text-zinc-400"><span>{label}</span><div className="flex items-center gap-2"><Input type="number" step="0.01" value={value} disabled={disabled} onChange={(event) => onChange(numeric(event.target.value))} /><span>{suffix}</span></div></label>;
}
function EditableMoney({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled: boolean }) {
  return <TableCell><Input className="min-w-24 text-right" type="number" min="0" step="0.01" value={value} disabled={disabled} onChange={(event) => onChange(numeric(event.target.value))} /></TableCell>;
}
function EditableNumber({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled: boolean }) {
  return <TableCell><Input className="min-w-20 text-right" type="number" min="0" step="1" value={value} disabled={disabled} onChange={(event) => onChange(numeric(event.target.value))} /></TableCell>;
}
