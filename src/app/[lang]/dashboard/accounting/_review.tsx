'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { reviewJournalEntry } from './actions';

export type ReviewLine = {
  id: string;
  accountLabel: string;
  entryType: string;
  amount: string;
};

function money(value: number) {
  return value.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReviewJournalButton({
  id,
  journalNumber,
  description,
  posted,
  lines,
}: {
  id: string;
  journalNumber: string;
  description: string | null;
  posted: boolean;
  lines: ReviewLine[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const debit = lines.reduce((sum, line) => sum + (line.entryType === 'debit' ? parseFloat(line.amount || '0') || 0 : 0), 0);
  const credit = lines.reduce((sum, line) => sum + (line.entryType === 'credit' ? parseFloat(line.amount || '0') || 0 : 0), 0);

  async function save() {
    setSaving(true);
    const res = await reviewJournalEntry(id);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Прегледът не беше записан');
      return;
    }
    if (res.posted && res.already) {
      toast.success('За тази статия вече има задача');
    } else if (res.posted) {
      toast.success('Публикуваната статия не се променя. Записана е задача за преглед.');
    } else {
      toast.success('Прегледът е записан');
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-rose-600 hover:bg-rose-50 border-rose-200">
          Прегледай
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Статия {journalNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted-foreground">{description || 'Без описание'}</p>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Сметка</th>
                  <th className="px-3 py-2 text-right font-medium">Дебит</th>
                  <th className="px-3 py-2 text-right font-medium">Кредит</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{line.accountLabel}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {line.entryType === 'debit' ? `${money(parseFloat(line.amount || '0') || 0)} €` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {line.entryType === 'credit' ? `${money(parseFloat(line.amount || '0') || 0)} €` : '—'}
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Няма редове.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Дебит {money(debit)} € · Кредит {money(credit)} € · Разлика {money(Math.abs(debit - credit))} €
          </p>
          {posted && (
            <p className="text-xs text-muted-foreground">
              Публикувана статия не се променя. Прегледът се записва като задача.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Отказ</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Записва...' : 'Запиши прегледа'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
