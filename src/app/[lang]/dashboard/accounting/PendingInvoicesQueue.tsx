'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle, FileText, Loader2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { postPendingInvoice } from './actions';

import type { PendingAccountingItem } from '@/lib/accounting/post-invoice';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PendingInvoicesQueue({
  lang,
  items,
}: {
  lang: string;
  items: PendingAccountingItem[];
}) {
  const router = useRouter();
  const [postingId, setPostingId] = useState<string | null>(null);

  const handlePost = async (item: PendingAccountingItem) => {
    setPostingId(`${item.source}:${item.id}`);
    try {
      const result = await postPendingInvoice({
        source: item.source,
        invoiceId: item.id,
        lang,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Осчетоводено — ${result.journalNumber}`);
      router.refresh();
    } catch {
      toast.error('Грешка при осчетоводяване');
    } finally {
      setPostingId(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Източник</TableHead>
          <TableHead>Основание / описание</TableHead>
          <TableHead className="text-right">Сума</TableHead>
          <TableHead>Предложена контировка</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const rowKey = `${item.source}:${item.id}`;
          const isPosting = postingId === rowKey;
          const isSales = item.source === 'sales_invoice';

          return (
            <TableRow key={rowKey}>
              <TableCell className="pl-6">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-500" />
                  <div>
                    <span className="font-medium text-sm">
                      {isSales ? 'Продажба' : 'Покупка'} {item.invoiceNumber}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm font-medium">{item.counterpartyName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.issueDate
                    ? `Дата ${new Date(item.issueDate).toLocaleDateString('bg-BG')}`
                    : 'Без дата'}
                </p>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-sm">
                {fmt(parseFloat(item.totalAmount || '0'))} €
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 gap-1">
                    <Zap size={12} />
                    Дт {item.suggestedAccount} ({item.suggestedAccountName})
                  </Badge>
                  <span className="text-xs text-muted-foreground max-w-[280px]">{item.reasoning}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    disabled={isPosting}
                    onClick={() => handlePost(item)}
                  >
                    {isPosting ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-1" />
                        Осчетоводява...
                      </>
                    ) : (
                      'Осчетоводи'
                    )}
                  </Button>
                  <Link
                    href={item.detailHref}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8')}
                  >
                    Детайли
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
              Всички документи са осчетоводени.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
