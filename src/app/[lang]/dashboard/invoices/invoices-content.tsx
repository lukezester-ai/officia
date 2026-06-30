'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getInvoices, issueInvoice, markInvoicePaid, cancelInvoice } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { NewInvoiceDialog } from './_form';
import { InvoiceTable } from './_table';
import { ExportInvoicesButton } from './ExportInvoicesButton';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesPageContent() {
  const searchParams = useSearchParams();
  const autoNew = searchParams.get('new') === '1';
  const openId = searchParams.get('open');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await getInvoices();
    if (res.success) setInvoices(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (action: string, id: string) => {
    let res: any;
    if (action === 'issue') res = await issueInvoice(id);
    else if (action === 'paid') res = await markInvoicePaid(id);
    else if (action === 'cancel') res = await cancelInvoice(id);
    if (res?.success) {
      const labels: Record<string, string> = {
        issue: 'Издадена и вписана в ДДС дневник!',
        paid: 'Маркирана като платена.',
        cancel: 'Анулирана.',
      };
      toast.success(labels[action]);
      await load();
    } else {
      toast.error('Грешка: ' + res?.error);
    }
  };

  const draft = invoices.filter(i => i.status === 'draft');
  const issued = invoices.filter(i => i.status === 'issued');
  const paid = invoices.filter(i => i.status === 'paid');
  const totalIssued = issued.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
  const totalPaid = paid.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Фактури</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Издаване и управление на фактури.</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportInvoicesButton invoices={invoices} />
          <NewInvoiceDialog onCreated={load} defaultOpen={autoNew} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <FileText size={14} /> Общо
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white tabular-nums">{invoices.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Clock size={14} className="text-zinc-500" /> Чернови
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-zinc-400 tabular-nums">{draft.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-violet-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Send size={14} className="text-violet-400" /> Издадени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-400 tabular-nums drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]">{issued.length}</div>
            <div className="text-xs text-zinc-500 tabular-nums">{fmt(totalIssued)} €</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" /> Платени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{paid.length}</div>
            <div className="text-xs text-zinc-500 tabular-nums">{fmt(totalPaid)} €</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Всички фактури</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Всички ({invoices.length})</TabsTrigger>
                <TabsTrigger value="draft">Чернови ({draft.length})</TabsTrigger>
                <TabsTrigger value="issued">Издадени ({issued.length})</TabsTrigger>
                <TabsTrigger value="paid">Платени ({paid.length})</TabsTrigger>
                <TabsTrigger value="needs_review">За преглед ({invoices.filter(i => i.aiStatus === 'needs_review' || i.aiStatus === 'duplicate_suspected').length})</TabsTrigger>
                <TabsTrigger value="overdue">Просрочени ({invoices.filter(i => i.status === 'issued' && i.dueDate && new Date(i.dueDate) < new Date()).length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <InvoiceTable items={invoices} onAction={handleAction} initialOpenId={openId} />
              </TabsContent>
              <TabsContent value="draft">
                <InvoiceTable items={draft} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="issued">
                <InvoiceTable items={issued} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="paid">
                <InvoiceTable items={paid} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="needs_review">
                <InvoiceTable items={invoices.filter(i => i.aiStatus === 'needs_review' || i.aiStatus === 'duplicate_suspected')} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="overdue">
                <InvoiceTable items={invoices.filter(i => i.status === 'issued' && i.dueDate && new Date(i.dueDate) < new Date())} onAction={handleAction} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
