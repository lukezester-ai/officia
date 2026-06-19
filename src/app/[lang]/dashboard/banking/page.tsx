// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Plus, RefreshCw, CheckCircle2, ArrowUpRight, ArrowDownRight, Bot, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { getBankAccounts, getBankTransactions, reconcileTransaction } from './actions';

export default function BankingPage() {
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleRefresh = async () => { await loadData(); toast.success('Данните са опреснени.'); };

  const handleReconcile = async (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, isReconciled: true } : t));
    const res = await reconcileTransaction(id);
    if (!res.success) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, isReconciled: false } : t));
      toast.error('Грешка при съпоставяне');
    } else {
      toast.success('Транзакцията е съпоставена.');
    }
  };

  const handleAIMatch = async () => {
    setIsSyncing(true);
    toast.info('Стартиране на AI анализ...', { duration: 3000 });
    const unmatched = transactions.find(t => !t.isReconciled);
    if (!unmatched) { toast.info('Всички транзакции вече са съпоставени.'); setIsSyncing(false); return; }
    try {
      const response = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: { id: unmatched.id, description: unmatched.description, amount: parseFloat(unmatched.amount), currency: unmatched.currency, date: unmatched.date },
          candidates: []
        })
      });
      const result = await response.json();
      if (result.matchedId && result.confidenceScore >= 85) {
        await handleReconcile(unmatched.id);
        toast.success(`Съпоставено! (${result.confidenceScore}%) — ${result.reason}`, { duration: 6000 });
      } else {
        toast.warning(`AI не намери съвпадение. ${result.reason || ''}`, { duration: 5000 });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Банкови Сметки</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Отворено банкиране и автоматично разпознаване на преводи.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Plus size={16} /> Свържи Банка
          </Button>
          <Button onClick={handleAIMatch} disabled={isSyncing} className="gap-2">
            <Bot size={16} className={isSyncing ? 'animate-pulse' : ''} />
            {isSyncing ? 'Анализиране...' : 'AI Съпоставяне'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Зареждане на банкови данни...</div>
      ) : accounts.length === 0 ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <CreditCard size={40} className="text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm text-center">
              Няма свързани банкови сметки.<br />Използвай бутона „Свържи Банка" за да добавиш.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc: any) => (
            <Card key={acc.id} className="shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Landmark size={80} />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{acc.institutionName || 'Банка'}</CardTitle>
                <CardDescription className="font-mono text-xs">{acc.iban || '—'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mt-2">
                  {parseFloat(acc.balance || '0').toFixed(2)} {acc.currency || 'BGN'}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Общо салдо (BGN)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalBalance.toFixed(2)} лв.</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Последни Транзакции</CardTitle>
            <CardDescription>Банкови движения — {transactions.length} записа</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleRefresh}>
            <RefreshCw size={14} /> Опресни
          </Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Няма банкови транзакции.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Основание / Получател</TableHead>
                  <TableHead>Сума</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((trx: any) => {
                  const amount = parseFloat(trx.amount || '0');
                  const isIncome = amount >= 0;
                  return (
                    <TableRow key={trx.id}>
                      <TableCell className="text-muted-foreground">
                        {trx.date ? new Date(trx.date).toLocaleDateString('bg-BG') : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {trx.description || trx.counterpartyName || '—'}
                      </TableCell>
                      <TableCell className={`font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center gap-1">
                          {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {Math.abs(amount).toFixed(2)} {trx.currency || 'BGN'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {trx.isReconciled ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1 px-2">
                            <CheckCircle2 size={12} /> Съпоставена
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1 px-2">
                            Чака документ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!trx.isReconciled && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleReconcile(trx.id)}>
                            Съпостави
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
    </div>
  );
}