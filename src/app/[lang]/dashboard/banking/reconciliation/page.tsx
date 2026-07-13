'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getTransactionsForReview, acceptMatch, rejectMatch, getAICandidates, manualMatch } from '../actions';
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

  const [manualModalTx, setManualModalTx] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [manualSaving, setManualSaving] = useState(false);

  const openManualModal = async (tx: any) => {
    setManualModalTx(tx);
    setSelectedCandidateId('');
    const res = await getAICandidates();
    if (res.success) setCandidates(res.data);
  };

  const handleManualSubmit = async () => {
    if (!manualModalTx || !selectedCandidateId) return;
    setManualSaving(true);
    const cand = candidates.find(c => c.id === selectedCandidateId);
    const res = await manualMatch(manualModalTx.id, selectedCandidateId, cand?.type || 'invoice');
    if (res.success) {
      toast.success('Успешно ръчно свързване!');
      setManualModalTx(null);
      await load();
    } else {
      toast.error('Грешка: ' + res.error);
    }
    setManualSaving(false);
  };

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
                          onClick={() => openManualModal(tx)}
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

      <Dialog open={!!manualModalTx} onOpenChange={open => !open && setManualModalTx(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Ръчно свързване с документ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
              <p className="text-zinc-400 text-xs">Транзакция:</p>
              <p className="font-medium mt-0.5">{manualModalTx?.counterpartyName || 'Неизвестен'}</p>
              <p className="text-emerald-400 font-bold mt-1">
                {manualModalTx && fmt(parseFloat(manualModalTx.amount || '0'))} {manualModalTx?.currency || 'EUR'}
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Изберете неплатена фактура / разход *</label>
              <select
                value={selectedCandidateId}
                onChange={e => setSelectedCandidateId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="" className="bg-zinc-900 text-zinc-500">Изберете документ...</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-200">
                    [{c.type === 'invoice' ? 'Фактура' : 'Разход'}] #{c.documentNumber} — {c.counterpartyName} ({fmt(c.totalAmount)} {c.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualModalTx(null)} className="border-white/10 text-zinc-400">
              Отказ
            </Button>
            <Button 
              onClick={handleManualSubmit} 
              disabled={!selectedCandidateId || manualSaving} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {manualSaving ? 'Свързване...' : 'Свържи'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
