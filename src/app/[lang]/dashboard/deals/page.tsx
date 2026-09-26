'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DEAL_STAGES, type DealStage } from '@/lib/crm/deals';
import { getCounterparties } from '../counterparties/actions';
import { createDeal, listDeals, moveDeal } from './actions';

type Deal = {
  id: string;
  title: string;
  amount: string;
  currency: string | null;
  stage: string;
  counterpartyName: string | null;
};

type Client = { id: string; name: string; type: string; isActive: boolean };

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [stage, setStage] = useState<DealStage>('lead');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [dealRes, clientRes] = await Promise.all([listDeals(), getCounterparties()]);
    if (dealRes.success) setDeals(dealRes.data);
    if (clientRes.success) {
      setClients((clientRes.data || []).filter((row: Client) => row.isActive !== false && (row.type === 'client' || row.type === 'both')));
    }
  }

  useEffect(() => { void load(); }, []);

  async function addDeal() {
    setSaving(true);
    const res = await createDeal({ title, amount, currency, stage, counterpartyId: counterpartyId || undefined });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Сделката не беше записана.');
      return;
    }
    setTitle('');
    setAmount('');
    setCounterpartyId('');
    toast.success('Сделката е записана.');
    await load();
  }

  async function changeStage(id: string, next: string) {
    const previous = deals;
    setDeals((rows) => rows.map((row) => row.id === id ? { ...row, stage: next } : row));
    const res = await moveDeal(id, next);
    if (!res.success) {
      setDeals(previous);
      toast.error(res.error || 'Етапът не беше сменен.');
    }
  }

  return (
    <div className="space-y-6 pb-10 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Сделки</h1>
        <p className="mt-1 text-sm text-zinc-400">Заявки, оферти и спечелени продажби по клиенти.</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Сделка, напр. Годишен договор" className="bg-zinc-950 border-white/10" />
        <select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm">
          <option value="">Без клиент</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сума" inputMode="decimal" className="bg-zinc-950 border-white/10" />
        <div className="flex gap-2">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm">
            <option value="EUR">EUR</option>
            <option value="BGN">BGN</option>
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value as DealStage)} className="flex-1 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm">
            {DEAL_STAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <Button onClick={addDeal} disabled={saving} className="bg-violet-600 hover:bg-violet-700 md:col-span-2">
          {saving ? 'Запис...' : 'Добави сделка'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {DEAL_STAGES.map((item) => {
          const rows = deals.filter((deal) => deal.stage === item.id);
          const total = rows.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);
          return (
            <section key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">{item.label}</h2>
                <span className="text-xs text-zinc-400">{rows.length}</span>
              </div>
              <p className="mb-3 text-xs text-zinc-500">{total.toFixed(2)}</p>
              <ul className="space-y-2">
                {rows.map((deal) => (
                  <li key={deal.id} className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-zinc-400">{deal.counterpartyName || 'Без клиент'}</p>
                    <p className="mt-1 text-sm tabular-nums">{deal.amount} {deal.currency || 'EUR'}</p>
                    <select
                      value={deal.stage}
                      onChange={(e) => { void changeStage(deal.id, e.target.value); }}
                      className="mt-2 w-full rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs"
                    >
                      {DEAL_STAGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
