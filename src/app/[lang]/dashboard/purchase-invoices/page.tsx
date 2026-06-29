'use client';
import { useState, useEffect } from 'react';
import { getPurchaseInvoices } from './actions-read';
import { approvePurchaseInvoice, markPurchaseInvoicePaid, cancelPurchaseInvoice } from './actions-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, ThumbsUp, Clock, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { NewPurchaseInvoiceDialog } from './_form';
import { PurchaseInvoiceTable } from './_table';
import { AiScannerDialog } from './ai-scanner';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await getPurchaseInvoices();
    if (res.success) setInvoices(res.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAction = async (action: string, id: string) => {
    let res: any;
    if (action === 'approve') res = await approvePurchaseInvoice(id);
    else if (action === 'paid') res = await markPurchaseInvoicePaid(id);
    else if (action === 'cancel') res = await cancelPurchaseInvoice(id);
    if (res?.success) {
      const labels: Record<string, string> = {
        approve: 'Одобрена и вписана в ДДС дневник покупки!',
        paid: 'Маркирана като платена.',
        cancel: 'Анулирана.',
      };
      toast.success(labels[action]);
      await load();
    } else { toast.error('Грешка: ' + res?.error); }
  };

  const draft = invoices.filter(i => i.status === 'draft');
  const approved = invoices.filter(i => i.status === 'approved');
  const paid = invoices.filter(i => i.status === 'paid');
  const totalApproved = approved.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
  const totalPaid = paid.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Входящи Фактури
            <span className="text-xs font-semibold px-2 py-1 bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-md flex items-center gap-1">
              <Scan size={12} /> AI Скенер
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Сканиране, въвеждане и управление на фактури от доставчици.</p>
        </div>
        <div className="flex gap-3">
          <NewPurchaseInvoiceDialog onCreated={load} />
          <AiScannerDialog onScanned={load} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <FileText size={14} className="text-blue-400" /> Общо
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{invoices.length}</div></CardContent>
        </Card>
        
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-zinc-500/30">
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
              <ThumbsUp size={14} className="text-violet-400" /> Одобрени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-400 tabular-nums drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]">{approved.length}</div>
            <div className="text-xs text-zinc-500 tabular-nums">{fmt(totalApproved)} €</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" /> Платени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{paid.length}</div>
            <div className="text-xs text-zinc-500 tabular-nums">{fmt(totalPaid)} €</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-zinc-500 py-16 text-center">Зареждане на входящи фактури...</p>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <div className="px-6 pt-4 border-b border-white/5">
                <TabsList className="bg-white/5 border border-white/10 p-1 mb-4">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400">Всички ({invoices.length})</TabsTrigger>
                  <TabsTrigger value="draft" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400">Чернови ({draft.length})</TabsTrigger>
                  <TabsTrigger value="approved" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 text-zinc-400">Одобрени ({approved.length})</TabsTrigger>
                  <TabsTrigger value="paid" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-zinc-400">Платени ({paid.length})</TabsTrigger>
                </TabsList>
              </div>
              <div className="p-0">
                <TabsContent value="all" className="mt-0 border-0 p-0">
                  <PurchaseInvoiceTable items={invoices} onAction={handleAction} />
                </TabsContent>
                <TabsContent value="draft" className="mt-0 border-0 p-0">
                  <PurchaseInvoiceTable items={draft} onAction={handleAction} />
                </TabsContent>
                <TabsContent value="approved" className="mt-0 border-0 p-0">
                  <PurchaseInvoiceTable items={approved} onAction={handleAction} />
                </TabsContent>
                <TabsContent value="paid" className="mt-0 border-0 p-0">
                  <PurchaseInvoiceTable items={paid} onAction={handleAction} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
