'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, Zap, Building, Calendar, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvoiceDrawer({ invoice, open, onOpenChange }: { invoice: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  if (!invoice) return null;

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
              <Button variant="outline" className="justify-start gap-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border-white/10 bg-white/5" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}>
                <FileText size={16} />
                PDF
              </Button>
              <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300" onClick={() => window.open(`/api/invoices/${invoice.id}/docx`, '_blank')}>
                <Download size={16} />
                Word
              </Button>
              <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300" onClick={() => toast.info('Търсене за дубликати...')}>
                <CheckCircle size={16} className="text-emerald-500" />
                Провери дубликат
              </Button>
              <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300" onClick={() => toast.info('Свързване с банка...')}>
                <DollarSign size={16} className="text-amber-500" />
                Свържи с банка
              </Button>
              <Button variant="outline" className="justify-start gap-2 hover:bg-white/10 border-white/10 bg-white/5 text-zinc-300">
                <Clock size={16} />
                Създай задача
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
                <div>{fmt(parseFloat(invoice.totalAmount || '0'))} €</div>
              </div>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

