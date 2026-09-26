'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createPaymentOrder, exportPaymentOrders, importBankStatement, listPaymentOrders } from './actions';

type Account = { id: string; institutionName?: string | null; iban?: string | null };
type Order = {
  id: string;
  accountId: string;
  kind: string | null;
  beneficiaryName: string;
  beneficiaryIban: string;
  amount: string;
  currency: string | null;
  reason: string;
  status: string | null;
};

export function PaymentsPanel({ accounts, onImported }: { accounts: Account[]; onImported: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [kind, setKind] = useState<'transfer' | 'budget'>('transfer');
  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [budgetCode, setBudgetCode] = useState('');
  const [liableId, setLiableId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accountId && accounts[0]?.id) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  async function reload() {
    const res = await listPaymentOrders();
    if (res.success) setOrders(res.data);
  }

  useEffect(() => { void reload(); }, []);

  async function addOrder() {
    if (!accountId) {
      toast.error('Първо запишете фирмена сметка.');
      return;
    }
    setBusy(true);
    const res = await createPaymentOrder({
      accountId,
      kind,
      beneficiaryName: name,
      beneficiaryIban: iban,
      amount: Number(amount),
      currency: 'EUR',
      reason,
      budgetCode,
      liableId,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error || 'Плащането не беше записано.');
      return;
    }
    setName('');
    setIban('');
    setAmount('');
    setReason('');
    setBudgetCode('');
    setLiableId('');
    toast.success('Плащането е в чернова.');
    await reload();
  }

  async function exportFile() {
    if (!accountId) return;
    setBusy(true);
    const res = await exportPaymentOrders(accountId);
    setBusy(false);
    if (!res.success || !res.csv || !res.filename) {
      toast.error(res.error || 'Няма файл за сваляне.');
      return;
    }
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = res.filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Файлът е готов: ${res.count} плащания. Качете го в интернет банкирането.`);
    await reload();
  }

  async function onStatement(file: File | undefined) {
    if (!file || !accountId) return;
    const text = await file.text();
    const res = await importBankStatement(accountId, text);
    if (!res.success) {
      toast.error(res.error || 'Извлечението не беше прочетено.');
      return;
    }
    toast.success(`Влязоха ${res.count} движения.`);
    onImported();
  }

  const drafts = orders.filter((order) => order.accountId === accountId && order.status === 'draft');

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-lg text-white">Масови и бюджетни преводи</CardTitle>
        <p className="text-sm text-zinc-400">Черновите се свалят като CSV. Парите не тръгват от Officia, докато файлът не се качи в банката.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-zinc-400">Запишете фирмена сметка, за да добавите плащане.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.institutionName || 'Сметка'} · {account.iban || 'без IBAN'}</option>
                ))}
              </select>
              <select value={kind} onChange={(e) => setKind(e.target.value as 'transfer' | 'budget')} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
                <option value="transfer">Обикновен превод</option>
                <option value="budget">Бюджетно плащане</option>
              </select>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Получател" className="bg-zinc-950 border-white/10" />
              <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN на получателя" className="bg-zinc-950 border-white/10 font-mono" />
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сума в EUR" inputMode="decimal" className="bg-zinc-950 border-white/10" />
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Основание" className="bg-zinc-950 border-white/10" />
              {kind === 'budget' && (
                <>
                  <Input value={budgetCode} onChange={(e) => setBudgetCode(e.target.value)} placeholder="Код за вид плащане (6 цифри)" className="bg-zinc-950 border-white/10" />
                  <Input value={liableId} onChange={(e) => setLiableId(e.target.value)} placeholder="ЕГН или ЕИК" className="bg-zinc-950 border-white/10" />
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={addOrder} disabled={busy} className="bg-violet-600 hover:bg-violet-700">Добави в чернова</Button>
              <Button onClick={exportFile} disabled={busy || drafts.length === 0} variant="outline" className="border-white/10 bg-white/5 text-white">Свали файл ({drafts.length})</Button>
              <label className="inline-flex cursor-pointer items-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                Качи извлечение
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { void onStatement(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            </div>
            {drafts.length > 0 && (
              <ul className="space-y-2 text-sm text-zinc-300">
                {drafts.map((order) => (
                  <li key={order.id} className="flex justify-between gap-3 border-b border-white/10 pb-2">
                    <span>{order.kind === 'budget' ? 'Бюджетно' : 'Превод'} · {order.beneficiaryName}</span>
                    <span className="tabular-nums">{order.amount} {order.currency || 'EUR'}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
