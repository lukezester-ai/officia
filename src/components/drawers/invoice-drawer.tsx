'use client';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, Zap, ArrowRight, Building, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { checkInvoiceDuplicate, createInvoiceTask, linkInvoiceToBankMove, listInvoiceBankMoves } from '@/app/[lang]/dashboard/invoices/actions';
import { getInvoiceEffectiveAmount } from '@/lib/utils/invoice-amount';

function BankLink({ invoiceId, linked, onLinked }: { invoiceId: string; linked?: string | null; onLinked: (transactionId: string) => void }) {
  const [moves, setMoves] = useState<{ id: string; label: string }[]>([]);
  const [moveId, setMoveId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (linked) return;
    void listInvoiceBankMoves().then((res) => {
      if (res.success) setMoves(res.data);
    });
  }, [linked]);

  async function link() {
    setSaving(true);
    const res = await linkInvoiceToBankMove(invoiceId, moveId);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Фактурата не беше свързана.');
      return;
    }
    onLinked(res.transactionId);
    toast.success(res.already ? 'Фактурата вече е свързана с движение.' : 'Движението е свързано с фактурата.');
  }

  if (linked) {
    return (
      <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300" onClick={() => toast.success('Фактурата вече е свързана с движение.')}>
        <DollarSign size={16} className="text-amber-500" />
        Свързана с движение
      </Button>
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <select
        value={moveId}
        onChange={(e) => setMoveId(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{moves.length ? 'Избери движение' : 'Няма несвързано движение'}</option>
        {moves.map((move) => (
          <option key={move.id} value={move.id}>{move.label}</option>
        ))}
      </select>
      <Button variant="outline" className="w-full justify-start gap-2" onClick={link} disabled={saving || !moveId}>
        <DollarSign size={16} className="text-amber-500" />
        {saving ? 'Запис...' : 'Свържи с банка'}
      </Button>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoiceDrawer({ invoice, open, onOpenChange, onChecked, onBankLinked }: { invoice: any, open: boolean, onOpenChange: (open: boolean) => void, onChecked?: (aiStatus: string | null) => void, onBankLinked?: (transactionId: string) => void }) {
  const [checking, setChecking] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  if (!invoice) return null;

  async function checkDuplicate() {
    setChecking(true);
    const res = await checkInvoiceDuplicate(invoice.id);
    setChecking(false);
    if (!res.success) {
      toast.error(res.error || 'Проверката не мина.');
      return;
    }
    onChecked?.(res.aiStatus);
    if (res.matches.length === 0) {
      toast.success('Няма друга фактура със същия номер или със същия клиент, дата и сума.');
      return;
    }
    const numbers = res.matches.map((row) => row.invoiceNumber).filter(Boolean).join(', ');
    toast.error(`Съвпада с фактура ${numbers}.`);
  }

  async function createTask() {
    setSavingTask(true);
    const res = await createInvoiceTask(invoice.id);
    setSavingTask(false);
    if (!res.success) {
      toast.error(res.error || 'Задачата не беше записана.');
      return;
    }
    toast.success(res.already ? 'Задачата вече е в списъка.' : 'Задачата е в „Задачи“.');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-l border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex justify-between items-center">
            <span>Фактура № {invoice.invoiceNumber}</span>
            <Badge variant="outline" className="uppercase text-xs">{invoice.status}</Badge>
          </SheetTitle>
          <SheetDescription>
            {invoice.counterpartyName || 'Неизвестен контрагент'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* AI Status Panel */}
          {(invoice.aiStatus === 'needs_review' || invoice.aiStatus === 'duplicate_suspected') && (
            <div className={`p-4 rounded-xl border ${invoice.aiStatus === 'duplicate_suspected' ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/30' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30'}`}>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Zap size={16} className={invoice.aiStatus === 'duplicate_suspected' ? 'text-rose-500' : 'text-amber-500'} /> 
                AI Предупреждение
              </h4>
              <p className="text-sm text-muted-foreground">
                {invoice.aiStatus === 'duplicate_suspected' 
                  ? 'Тази фактура прилича на дубликат. Проверете за вече съществуваща.'
                  : 'Липсват някои данни или е нужен ръчен преглед от счетоводител.'}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Бързи действия</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start gap-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border-white/10 bg-white/5" onClick={() => window.open(`/invoice-print/${invoice.id}`, '_blank')}>
                <FileText size={16} />
                Свали PDF
              </Button>
              <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300" onClick={checkDuplicate} disabled={checking}>
                <CheckCircle size={16} className="text-emerald-500" />
                {checking ? 'Проверка...' : 'Провери дубликат'}
              </Button>
              <BankLink
                invoiceId={invoice.id}
                linked={invoice.matchedTransactionId}
                onLinked={(transactionId) => onBankLinked?.(transactionId)}
              />
              <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300" onClick={createTask} disabled={savingTask}>
                <Clock size={16} />
                {savingTask ? 'Запис...' : 'Създай задача'}
              </Button>
            </div>
          </div>

          {/* Основна информация */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Основни данни</h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Building size={16}/> Контрагент</div>
                <div className="font-medium text-right">{invoice.counterpartyName || '—'}</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><FileText size={16}/> ЕИК</div>
                <div className="font-medium text-right">{invoice.counterpartyEik || '—'}</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Calendar size={16}/> Дата на издаване</div>
                <div className="font-medium text-right">{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('bg-BG') : '—'}</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Clock size={16}/> Падеж</div>
                <div className="font-medium text-right">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('bg-BG') : '—'}</div>
              </div>
            </div>
          </div>

          {/* Финансова част */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Финанси</h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <div className="text-muted-foreground">Данъчна основа</div>
                <div className="font-medium text-right">{fmt(parseFloat(invoice.netAmount || '0'))} €</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="text-muted-foreground">ДДС сума</div>
                <div className="font-medium text-right">{fmt(parseFloat(invoice.vatAmount || '0'))} €</div>
              </div>
              <div className="flex justify-between items-center text-base font-bold pt-3 border-t border-border mt-3">
                <div>Общо за плащане</div>
                <div>{fmt(getInvoiceEffectiveAmount(invoice))} €</div>
              </div>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

