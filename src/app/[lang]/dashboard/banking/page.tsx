'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Plus, RefreshCw, CheckCircle2, ArrowUpRight, ArrowDownRight, Bot, CreditCard, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getBankAccounts, getBankTransactions, reconcileTransaction, seedMockBankingData, getAICandidates } from './actions';
import { BankConnectModal } from '@/components/dashboard/BankConnectModal';

export default function BankingPage() {
  const searchParams = useSearchParams();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  async function loadData() {
    setLoading(true);
    const [accRes, trxRes] = await Promise.all([getBankAccounts(), getBankTransactions()]);
    if (accRes.success && accRes.data) setAccounts(accRes.data);
    if (trxRes.success && trxRes.data) setTransactions(trxRes.data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (searchParams.get('connected') === '1') {
      toast.success('Банковата сметка е свързана. Синхронизирайте транзакциите.');
    }
    if (searchParams.get('error')) {
      toast.error('Грешка при свързване с банката.');
    }
  }, [searchParams]);

  const handlePsd2Sync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/bank/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      toast.success(`Синхронизирани ${data.imported} транзакции от PSD2.`);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => { await loadData(); toast.success('Данните са опреснени.'); };

  const handleOpenConnect = () => {
    setIsModalOpen(true);
  };

  const handleReconcile = async (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, isReconciled: true } : t));
    const res = await reconcileTransaction(id);
    if (!res.success) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, isReconciled: false } : t));
      toast.error('Грешка при съпоставяне');
    } else {
      toast.success('Транзакцията е съпоставена ръчно.');
    }
  };

  const handleAIMatch = async () => {
    setIsSyncing(true);
    toast.info('Стартиране на AI анализ...', { duration: 3000 });
    
    // Fetch candidates
    const candidatesRes = await getAICandidates();
    const candidates = candidatesRes.success ? candidatesRes.data : [];

    const unmatched = transactions.find(t => !t.isReconciled);
    if (!unmatched) { 
      toast.info('Всички транзакции вече са съпоставени.'); 
      setIsSyncing(false); 
      return; 
    }

    try {
      const response = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: { 
            id: unmatched.id, 
            description: unmatched.description, 
            amount: parseFloat(unmatched.amount), 
            currency: unmatched.currency, 
            date: unmatched.date 
          },
          candidates: candidates
        })
      });
      const result = await response.json();
      
      if (result.matchedId && result.confidenceScore >= 85) {
        await handleReconcile(unmatched.id);
        toast.success(`AI Съпоставяне (${result.confidenceScore}%) — ${result.reason}`, { duration: 6000 });
      } else {
        toast.warning(`AI се нуждае от преглед. ${result.reason || ''}`, { duration: 5000 });
      }
    } catch (err: any) {
      toast.error(err.message || 'Грешка при AI обработката');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalBalance = accounts.reduce((sum: number, acc: any) => {
    const bal = parseFloat(acc.balance || '0');
    return isNaN(bal) ? sum : sum + bal;
  }, 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Банкови Сметки (PSD2)</h1>
          <p className="text-sm text-zinc-400 mt-1">Отворено банкиране и автоматично AI разпознаване на преводи.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleOpenConnect} variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10">
            <Plus size={16} /> Свържи Банка
          </Button>
          <Button onClick={handlePsd2Sync} disabled={isSyncing} variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> PSD2 Sync
          </Button>
          <Button onClick={handleAIMatch} disabled={isSyncing} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] border border-violet-500/50">
            <Sparkles size={16} className={isSyncing ? 'animate-pulse text-amber-300' : 'text-amber-300'} />
            {isSyncing ? 'AI Анализира...' : 'AI Съпоставяне'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-sm">Зареждане на банкови данни...</div>
      ) : accounts.length === 0 ? (
        <Card className="shadow-sm border-dashed border-white/20 bg-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <CreditCard size={40} className="text-zinc-600" />
            <p className="text-zinc-400 text-sm text-center">
              Няма свързани банкови сметки.<br />PSD2 (Nordigen) или демо режим чрез „Свържи Банка".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc: any) => (
            <Card key={acc.id} className="shadow-sm relative overflow-hidden group hover:border-violet-500/50 transition-colors cursor-pointer bg-white/5 border-white/10">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                <Landmark size={80} className="text-violet-400" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">{acc.institutionName || 'Банка'}</CardTitle>
                <CardDescription className="font-mono text-xs text-zinc-400">{acc.iban || '—'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mt-2 text-white tabular-nums">
                  {parseFloat(acc.balance || '0').toFixed(2)} {acc.currency || 'EUR'}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="shadow-sm bg-violet-600/10 border-violet-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-violet-300 font-medium">Общо салдо (BGN)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-violet-400 tabular-nums">{totalBalance.toFixed(2)} лв.</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4 bg-white/5">
          <div className="flex items-center gap-2">
            <Landmark className="text-emerald-500" size={18} />
            <CardTitle className="text-lg text-white">Последни Транзакции</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-400 hover:text-white hover:bg-white/10" onClick={handleRefresh}>
            <RefreshCw size={14} /> Опресни
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">Няма банкови транзакции.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Дата</TableHead>
                  <TableHead className="text-zinc-400">Основание / Получател</TableHead>
                  <TableHead className="text-zinc-400">Сума</TableHead>
                  <TableHead className="text-zinc-400">Статус</TableHead>
                  <TableHead className="text-right text-zinc-400">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((trx: any) => {
                  const amount = parseFloat(trx.amount || '0');
                  const isIncome = amount >= 0;
                  return (
                    <TableRow key={trx.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                      <TableCell className="text-zinc-400 tabular-nums text-sm">
                        {trx.date ? new Date(trx.date).toLocaleDateString('bg-BG') : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-200">
                        {trx.description || trx.counterpartyName || '—'}
                        {trx.counterpartyName && trx.description && (
                          <div className="text-xs text-zinc-500 mt-0.5">{trx.counterpartyName}</div>
                        )}
                      </TableCell>
                      <TableCell className={`font-semibold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <div className="flex items-center gap-1.5">
                          {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(amount).toFixed(2)} {trx.currency || 'EUR'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {trx.isReconciled ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 px-2 hover:bg-emerald-500/20">
                            <CheckCircle2 size={12} /> Съпоставена
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-400 border-amber-500/20 bg-amber-500/10 gap-1.5 px-2">
                            Чака документ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!trx.isReconciled && (
                          <Button size="sm" variant="outline" className="h-8 text-xs bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10" onClick={() => handleReconcile(trx.id)}>
                            Ръчно
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <BankConnectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadData} 
      />
    </div>
  );
}