'use client';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, XCircle, Send, Zap, DollarSign } from 'lucide-react';
import { InvoiceDrawer } from '@/components/drawers/invoice-drawer';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Чернова', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  issued: { label: 'Издадена', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  paid: { label: 'Платена', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Анулирана', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

export function InvoiceTable({ items, onAction }: {
  items: any[];
  onAction: (action: string, id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handle = async (e: React.MouseEvent, action: string, id: string) => {
    e.stopPropagation();
    setBusy(id + action);
    await onAction(action, id);
    setBusy(null);
  };

  const openDrawer = (inv: any) => {
    setSelectedInvoice(inv);
    setDrawerOpen(true);
  };

  if (items.length === 0) return (
    <div className="text-center py-12">
      <FileText size={40} className="mx-auto text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">Няма фактури в тази категория.</p>
    </div>
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Номер</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Падеж</TableHead>
            <TableHead className="text-right">Общо</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>AI & Банка</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(inv => {
            const st = STATUS[inv.status] || STATUS.draft;
            return (
              <TableRow 
                key={inv.id} 
                className="group cursor-pointer hover:bg-muted/50" 
                onClick={() => openDrawer(inv)}
              >
                <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                <TableCell>{inv.counterpartyName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('bg-BG') : '—'}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {fmt(parseFloat(inv.totalAmount || '0'))}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    {inv.aiStatus === 'needs_review' && <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200"><Zap size={10} className="mr-1"/>AI Преглед</Badge>}
                    {inv.aiStatus === 'duplicate_suspected' && <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200"><Zap size={10} className="mr-1"/>Дубликат</Badge>}
                    {inv.matchedTransactionId ? (
                      <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200"><DollarSign size={10} className="mr-1"/>Платена</Badge>
                    ) : (
                      (inv.status === 'issued') && <Badge variant="outline" className="text-gray-500 bg-gray-50">Чака плащане</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 justify-end">
                    {inv.status === 'draft' && (
                      <Button variant="ghost" size="sm"
                        className="h-7 text-xs gap-1 text-indigo-600 hover:bg-indigo-50"
                        disabled={busy === inv.id + 'issue'}
                        onClick={(e) => handle(e, 'issue', inv.id)}>
                        <Send size={11} /> Издай
                      </Button>
                    )}
                    {inv.status === 'issued' && (
                      <Button variant="ghost" size="sm"
                        className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50"
                        disabled={busy === inv.id + 'paid'}
                        onClick={(e) => handle(e, 'paid', inv.id)}>
                        <CheckCircle size={11} /> Платена
                      </Button>
                    )}
                    {(inv.status === 'draft' || inv.status === 'issued') && (
                      <Button variant="ghost" size="sm"
                        className="h-7 text-xs text-rose-500 hover:bg-rose-50"
                        disabled={busy === inv.id + 'cancel'}
                        onClick={(e) => handle(e, 'cancel', inv.id)}>
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
      
      <InvoiceDrawer 
        invoice={selectedInvoice} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />
    </>
  );
}