// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTransactionsForReview, acceptMatch, rejectMatch } from '../actions';
import { ArrowLeft, CheckCircle, XCircle, Search, Link as LinkIcon, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReconciliationPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getTransactionsForReview();
    if (res.success) setTransactions(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAccept = async (id: string) => {
    setBusy(id);
    const res = await acceptMatch(id);
    if (res.success) {
      toast.success('Съвпадението е прието!');
      await load();
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setBusy(null);
  };

  const handleReject = async (id: string) => {
    setBusy(id);
    const res = await rejectMatch(id);
    if (res.success) {
      toast.info('Съвпадението е отхвърлено.');
      await load();
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/banking">
            <Button variant="outline" size="icon" className="h-9 w-9"><ArrowLeft size={16} /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">За преглед</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Транзакции с предложени фактури за свързване.</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Опашка за съгласуване</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Зареждане...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-medium">Всичко е наред!</p>
              <p className="text-sm text-muted-foreground">Няма транзакции, които да чакат преглед.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Основание</TableHead>
                  <TableHead className="text-right">Сума</TableHead>
                  <TableHead>Предложена Фактура</TableHead>
                  <TableHead>Увереност</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.date ? new Date(tx.date).toLocaleDateString('bg-BG') : '—'}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{tx.counterpartyName || 'Неизвестен наредител'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.description}</p>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${parseFloat(tx.amount || '0') > 0 ? 'text-emerald-600' : ''}`}>
                      {parseFloat(tx.amount || '0') > 0 ? '+' : ''}{fmt(parseFloat(tx.amount || '0'))}
                    </TableCell>
                    <TableCell>
                      {tx.matchStatus === 'proposed' && tx.matchedInvoiceId ? (
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-indigo-500"/>
                          <span className="text-sm font-medium">Свързване с фактура</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Няма предложение</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.matchConfidence !== null ? (
                        <Badge variant="outline" className={
                          tx.matchConfidence > 0.8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          tx.matchConfidence > 0.5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }>
                          {Math.round(tx.matchConfidence * 100)}% сигурност
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" size="sm" 
                          className="h-8 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          disabled={busy === tx.id}
                          onClick={() => handleAccept(tx.id)}
                        >
                          <CheckCircle size={14} className="mr-1" /> Приеми
                        </Button>
                        <Button 
                          variant="outline" size="sm" 
                          className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          disabled={busy === tx.id}
                          onClick={() => handleReject(tx.id)}
                        >
                          <XCircle size={14} className="mr-1" /> Отхвърли
                        </Button>
                        <Button 
                          variant="ghost" size="icon" 
                          className="h-8 w-8 text-muted-foreground"
                          title="Ръчно свързване"
                        >
                          <LinkIcon size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
