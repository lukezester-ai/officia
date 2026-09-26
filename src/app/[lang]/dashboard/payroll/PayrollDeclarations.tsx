'use client';

import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DeclarationDraft } from '@/lib/payroll/declarations';

const MONTHS = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
];

function money(value: string) {
  return `${Number(value).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function PayrollDeclarations({
  draft,
  xml,
  error,
}: {
  draft: DeclarationDraft | null;
  xml: string;
  error?: string;
}) {
  const download = () => {
    if (!draft || !xml) return;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Obr1_Obr6_${draft.year}_${String(draft.month).padStart(2, '0')}.xml`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Черновата за Обр. 1 и Обр. 6 е свалена.');
  };

  if (!draft) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="py-6 text-sm text-zinc-400">
          {error || 'Декларацията не можа да се подготви.'}
        </CardContent>
      </Card>
    );
  }

  const canExport = draft.eikValid && draft.persons.length > 0;

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Обр. 1 и Обр. 6</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {MONTHS[draft.month - 1]} {draft.year}, срок {draft.dueDate.split('-').reverse().join('.')}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Чернова от ведомостта за преглед. Качването става в портала на НАП. Officia не подава файла и не връща входящ номер.
              Ставките са за трудов договор, трета категория, родени след 1959 г. ТЗПБ не е включена. Осигурените дни са делниците в месеца.
            </p>
          </div>
          <Button
            type="button"
            onClick={download}
            disabled={!canExport}
            className="gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <Download size={16} /> Свали чернова
          </Button>
        </div>

        {!draft.eikValid && (
          <p className="text-sm text-amber-400">На фирмата липсва валиден ЕИК от 9 цифри. Черновата не се сваля.</p>
        )}

        {draft.missingIdentity.length > 0 && (
          <p className="text-sm text-amber-400">
            Без валидно ЕГН и извън сбора: {draft.missingIdentity.map((person) => `${person.firstName} ${person.lastName}`).join(', ')}.
          </p>
        )}

        {draft.persons.length === 0 ? (
          <p className="text-sm text-zinc-500">Няма служител с валидно ЕГН за този период.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Служител</th>
                  <th className="py-2 pr-4 font-medium">ЕГН</th>
                  <th className="py-2 pr-4 text-right font-medium">Основа</th>
                  <th className="py-2 pr-4 text-right font-medium">ДОО лице</th>
                  <th className="py-2 pr-4 text-right font-medium">ДЗПО лице</th>
                  <th className="py-2 pr-4 text-right font-medium">ЗО лице</th>
                  <th className="py-2 text-right font-medium">Данък</th>
                </tr>
              </thead>
              <tbody>
                {draft.persons.map((person) => (
                  <tr key={person.egn} className="border-b border-white/5 text-zinc-200">
                    <td className="py-2 pr-4">{person.firstName} {person.lastName}</td>
                    <td className="py-2 pr-4 tabular-nums">{person.egn}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{money(person.insuranceBase)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{money(person.employeeDoo)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{money(person.employeeDzpo)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{money(person.employeeZo)}</td>
                    <td className="py-2 text-right tabular-nums">{money(person.incomeTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-zinc-500">Осигуровки за внасяне</p>
            <p className="text-lg font-semibold tabular-nums text-white">{money(draft.summary.contributionsDue)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Данък по чл. 42 ЗДДФЛ</p>
            <p className="text-lg font-semibold tabular-nums text-white">{money(draft.summary.incomeTax)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Таван на осигурителния доход</p>
            <p className="text-lg font-semibold tabular-nums text-white">{money(draft.ceiling)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
