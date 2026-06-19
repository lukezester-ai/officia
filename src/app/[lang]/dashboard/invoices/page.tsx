// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { getInvoices, issueInvoice, markInvoicePaid, cancelInvoice } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { NewInvoiceDialog } from './_form';
import { InvoiceTable } from './_table';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesPage() {
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
        <NewInvoiceDialog onCreated={load} />
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
              <Send size={14} className="text-indigo-600" /> Издадени
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{issued.length}</div>
            <div className="text-xs text-muted-foreground">{fmt(totalIssued)} лв.</div>
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
            <div className="text-xs text-muted-foreground">{fmt(totalPaid)} лв.</div>
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
              </TabsList>
              <TabsContent value="all">
                <InvoiceTable items={invoices} onAction={handleAction} />
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
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}