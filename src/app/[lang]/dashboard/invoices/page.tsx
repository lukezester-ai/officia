'use client';
import { useState, useEffect } from 'react';
import { getInvoices, issueInvoice, markInvoicePaid, cancelInvoice } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { NewInvoiceDialog } from './_form';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Чернова', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  issued: { label: 'Издадена', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  paid: { label: 'Платена', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Анулирана', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

function InvoiceTable({ items, onAction }: { items: any[]; onAction: (action: string, id: string) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const handle = async (action: string, id: string) => {
    setBusy(id + action);
    await onAction(action, id);
    setBusy(null);
  };

  if (items.length === 0) return (
    <div className="text-center py-12">
      <FileText size={40} className="mx-auto text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">Няма фактури в тази категория.</p>
    </div>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Номер</TableHead>
          <TableHead>Клиент</TableHead>
          <TableHead>Дата</TableHead>
          <TableHead>Падеж</TableHead>
          <TableHead className="text-right">Основа</TableHead>
          <TableHead className="text-right">ДДС</TableHead>
          <TableHead className="text-right">Общо</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(inv => {
          const st = STATUS[inv.status] || STATUS.draft;
          return (
            <TableRow key={inv.id} className="group">
              <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
              <TableCell>{inv.counterpartyName}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('bg-BG') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('bg-BG') : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{fmt(parseFloat(inv.netAmount || '0'))}</TableCell>
              <TableCell className="text-right font-mono text-sm text-indigo-600">{fmt(parseFloat(inv.vatAmount || '0'))}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{fmt(parseFloat(inv.totalAmount || '0'))}</TableCell>
              <TableCell><Badge className={`text-xs ${st.color}`}>{st.label}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  {inv.status === 'draft' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-indigo-600 hover:bg-indigo-50"
                      disabled={busy === inv.id + 'issue'} onClick={() => handle('issue', inv.id)}>
                      <Send size={11} /> Издай
                    </Button>
                  )}
                  {inv.status === 'issued' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50"
                      disabled={busy === inv.id + 'paid'} onClick={() => handle('paid', inv.id)}>
                      <CheckCircle size={11} /> Платена
                    </Button>
                  )}
                  {(inv.status === 'draft' || inv.status === 'issued') && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:bg-rose-50"
                      disabled={busy === inv.id + 'cancel'} onClick={() => handle('cancel', inv.id)}>
                      <XCircle size={11} /> Анулирай
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
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
      const labels: Record<string, string> = { issue: 'Фактурата е издадена и вписана в ДДС дневник!', paid: 'Маркирана като платена.', cancel: 'Анулирана.' };
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
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><FileText size={14} /> Общо</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{invoices.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><Clock size={14} className="text-gray-500" /> Чернови</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-600">{draft.length}</div></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><Send size={14} className="text-indigo-600" /> Издадени</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{issued.length}</div>
            <div className="text-xs text-muted-foreground">{fmt(totalIssued)} лв.</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-600" /> Платени</CardTitle></CardHeader>
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
              <TabsContent value="all"><InvoiceTable items={invoices} onAction={handleAction} /></TabsContent>
              <TabsContent value="draft"><InvoiceTable items={draft} onAction={handleAction} /></TabsContent>
              <TabsContent value="issued"><InvoiceTable items={issued} onAction={handleAction} /></TabsContent>
              <TabsContent value="paid"><InvoiceTable items={paid} onAction={handleAction} /></TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}