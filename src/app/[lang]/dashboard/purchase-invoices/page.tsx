// @ts-nocheck
﻿'use client';
import { useState, useEffect } from 'react';
import { getPurchaseInvoices } from './actions-read';
import { approvePurchaseInvoice, markPurchaseInvoicePaid, cancelPurchaseInvoice } from './actions-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, ThumbsUp, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { NewPurchaseInvoiceDialog } from './_form';
import { PurchaseInvoiceTable } from './_table';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Покупни фактури</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Фактури от доставчици.</p>
        </div>
        <NewPurchaseInvoiceDialog onCreated={load} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <FileText size={14} /> Общо
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{invoices.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock size={14} className="text-gray-500" /> Чернови
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-600">{draft.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <ThumbsUp size={14} className="text-indigo-600" /> Одобрени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{approved.length}</div>
            <div className="text-xs text-muted-foreground">{fmt(totalApproved)} €</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" /> Платени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{paid.length}</div>
            <div className="text-xs text-muted-foreground">{fmt(totalPaid)} €</div>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Всички покупни фактури</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Всички ({invoices.length})</TabsTrigger>
                <TabsTrigger value="draft">Чернови ({draft.length})</TabsTrigger>
                <TabsTrigger value="approved">Одобрени ({approved.length})</TabsTrigger>
                <TabsTrigger value="paid">Платени ({paid.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <PurchaseInvoiceTable items={invoices} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="draft">
                <PurchaseInvoiceTable items={draft} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="approved">
                <PurchaseInvoiceTable items={approved} onAction={handleAction} />
              </TabsContent>
              <TabsContent value="paid">
                <PurchaseInvoiceTable items={paid} onAction={handleAction} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
