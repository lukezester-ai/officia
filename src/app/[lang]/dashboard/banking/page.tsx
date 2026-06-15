'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Plus, RefreshCw, CheckCircle2, ArrowUpRight, ArrowDownRight, Bot } from 'lucide-react';
import { toast } from 'sonner';

const mockAccounts = [
  { id: '1', name: 'UniCredit Bulbank', iban: 'BG12UNCR12345678901234', balance: '12,450.00 BGN' },
  { id: '2', name: 'Revolut Business', iban: 'LT123456789012345678', balance: '4,120.50 EUR' }
];

const mockTransactions = [
  { id: 't1', date: '2026-06-14', description: 'Amazon AWS EMEA', amount: '-120.50', currency: 'BGN', type: 'expense', matched: true },
  { id: 't2', date: '2026-06-13', description: 'TechCorp OOD - Invoice 1001', amount: '+2400.00', currency: 'BGN', type: 'income', matched: false },
  { id: 't3', date: '2026-06-12', description: 'Office Supplies - Office1', amount: '-45.00', currency: 'BGN', type: 'expense', matched: true },
];

export default function BankingPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [transactions, setTransactions] = useState(mockTransactions);

  const handleAIMatch = async () => {
    setIsSyncing(true);
    toast.info('Стартиране на AI анализ...', { duration: 3000 });
    
    try {
      // Истинско извикване към Claude 3.5 Sonnet
      const transactionToMatch = {
        id: 't2',
        description: 'TechCorp OOD - Invoice 1001',
        amount: 2400.00,
        currency: 'BGN',
        date: '2026-06-13'
      };

      const candidates = [
        { id: 'inv_100', type: 'invoice', counterpartyName: 'TechCorp OOD', totalAmount: 2400.00, currency: 'BGN', documentNumber: '1001' },
        { id: 'inv_101', type: 'invoice', counterpartyName: 'SoftUni', totalAmount: 500.00, currency: 'BGN', documentNumber: '205' },
        { id: 'exp_001', type: 'expense', counterpartyName: 'Amazon AWS', totalAmount: 120.50, currency: 'BGN' }
      ];

      const response = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: transactionToMatch, candidates })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process match');
      }

      if (result.matchedId && result.confidenceScore >= 85) {
        setTransactions(transactions.map(t => t.id === 't2' ? { ...t, matched: true } : t));
        toast.success(`Успешно съпоставено! (Сигурност: ${result.confidenceScore}%)\nПричина: ${result.reason}`, { duration: 6000 });
      } else {
        toast.warning(`Неуспешно съпоставяне. Причина: ${result.reason}`, { duration: 6000 });
      }

    } catch (err: any) {
      toast.error(err.message || 'Грешка при AI обработката');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D] dark:text-white">Банкови Сметки (PSD2)</h1>
          <p className="text-gray-500 mt-1">Отворено банкиране и автоматично разпознаване на преводи.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Plus size={16} /> Свържи Банка
          </Button>
          <Button onClick={handleAIMatch} disabled={isSyncing} className="bg-[#4F46E5] hover:bg-[#4338CA] gap-2">
            <Bot size={16} className={isSyncing ? "animate-pulse" : ""} /> {isSyncing ? 'Анализиране...' : 'AI Съпоставяне'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAccounts.map(acc => (
          <Card key={acc.id} className="border-gray-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-[#4F46E5]/50 transition-colors cursor-pointer">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Landmark size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {acc.name}
              </CardTitle>
              <CardDescription className="font-mono text-xs">{acc.iban}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#0F1F3D] dark:text-white mt-2">
                {acc.balance}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-gray-100 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Последни Транзакции</CardTitle>
            <CardDescription>Синхронизирани през Nordigen API</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
            <RefreshCw size={14} /> Опресни
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Основание / Получател</TableHead>
                <TableHead>Сума</TableHead>
                <TableHead>AI Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((trx) => (
                <TableRow key={trx.id}>
                  <TableCell className="text-gray-500">{trx.date}</TableCell>
                  <TableCell className="font-medium">{trx.description}</TableCell>
                  <TableCell className={`font-semibold ${trx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    <div className="flex items-center gap-1">
                      {trx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} className="text-rose-500" />}
                      {trx.amount} {trx.currency}
                    </div>
                  </TableCell>
                  <TableCell>
                    {trx.matched ? (
                      <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1 px-2 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-medium">
                        <CheckCircle2 size={12} /> Съпоставена
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 gap-1 px-2 font-medium">
                        Чака документ
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
