'use client';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, XCircle, ThumbsUp } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Чернова', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  approved: { label: 'Одобрена', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  paid: { label: 'Платена', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Анулирана', color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

export function PurchaseInvoiceTable({ items, onAction }: {
  items: any[];
  onAction: (action: string, id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const handle = async (action: string, id: string) => {
    setBusy(id + action); await onAction(action, id); setBusy(null);
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
          <TableHead>Доставчик</TableHead>
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
              <TableCell>{inv.supplierName}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('bg-BG') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('bg-BG') : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {fmt(parseFloat(inv.netAmount || '0'))}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-indigo-600">
                {fmt(parseFloat(inv.vatAmount || '0'))}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {fmt(parseFloat(inv.totalAmount || '0'))}
              </TableCell>
              <TableCell>
                <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  {inv.status === 'draft' && (
                    <Button variant="ghost" size="sm"
                      className="h-7 text-xs gap-1 text-indigo-600 hover:bg-indigo-50"
                      disabled={busy === inv.id + 'approve'}
                      onClick={() => handle('approve', inv.id)}>
                      <ThumbsUp size={11} /> Одобри
                    </Button>
                  )}
                  {inv.status === 'approved' && (
                    <Button variant="ghost" size="sm"
                      className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-50"
                      disabled={busy === inv.id + 'paid'}
                      onClick={() => handle('paid', inv.id)}>
                      <CheckCircle size={11} /> Платена
                    </Button>
                  )}
                  {(inv.status === 'draft' || inv.status === 'approved') && (
                    <Button variant="ghost" size="sm"
                      className="h-7 text-xs text-rose-500 hover:bg-rose-50"
                      disabled={busy === inv.id + 'cancel'}
                      onClick={() => handle('cancel', inv.id)}>
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
