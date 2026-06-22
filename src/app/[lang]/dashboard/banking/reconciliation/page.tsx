'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTransactionsForReview, acceptMatch, rejectMatch } from '../actions';
import { ArrowLeft, CheckCircle, XCircle, Search, Link as LinkIcon, DollarSign, FileText } from 'lucide-react';
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
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/banking">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">За преглед</h1>
            <p className="text-sm text-zinc-400 mt-1">Транзакции с предложени фактури за ръчно съгласуване.</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
          <CardTitle className="text-lg text-white">Опашка за съгласуване</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-zinc-500 py-8 text-center">Зареждане...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-80" />
              <p className="text-lg font-medium text-white">Всичко е наред!</p>
              <p className="text-sm text-zinc-400">Няма транзакции, които да чакат преглед.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Дата</TableHead>
                  <TableHead className="text-zinc-400">Основание</TableHead>
                  <TableHead className="text-right text-zinc-400">Сума</TableHead>
                  <TableHead className="text-zinc-400">Предложена Фактура</TableHead>
                  <TableHead className="text-zinc-400">Увереност</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="text-sm text-zinc-400 tabular-nums">
                      {tx.date ? new Date(tx.date).toLocaleDateString('bg-BG') : '—'}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm text-zinc-200">{tx.counterpartyName || 'Неизвестен наредител'}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-[250px]">{tx.description}</p>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${parseFloat(tx.amount || '0') > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {parseFloat(tx.amount || '0') > 0 ? '+' : ''}{fmt(parseFloat(tx.amount || '0'))} {tx.currency || 'EUR'}
                    </TableCell>
                    <TableCell>
                      {tx.matchStatus === 'proposed' || tx.matchedInvoiceId ? (
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-indigo-400"/>
                          <span className="text-sm font-medium text-zinc-300">Свързване с фактура</span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-500 italic">Няма предложение</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.matchConfidence !== null ? (
                        <Badge variant="outline" className={
                          Number(tx.matchConfidence) >= 0.8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          Number(tx.matchConfidence) >= 0.5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }>
                          {Math.round(Number(tx.matchConfidence) * 100)}% сигурност
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" size="sm" 
                          className="h-8 text-xs bg-white/5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                          disabled={busy === tx.id}
                          onClick={() => handleAccept(tx.id)}
                        >
                          <CheckCircle size={14} className="mr-1.5" /> Приеми
                        </Button>
                        <Button 
                          variant="outline" size="sm" 
                          className="h-8 text-xs bg-white/5 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                          disabled={busy === tx.id}
                          onClick={() => handleReject(tx.id)}
                        >
                          <XCircle size={14} className="mr-1.5" /> Отхвърли
                        </Button>
                        <Button 
                          variant="ghost" size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
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
