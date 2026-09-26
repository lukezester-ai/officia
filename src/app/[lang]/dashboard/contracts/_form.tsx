'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getCounterparties } from '../counterparties/actions';
import { createContractAction } from './actions';

type Client = { id: string; name: string; isActive: boolean; type: string };

export function NewContractForm({ lang }: { lang: string }) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getCounterparties().then((res) => {
      if (res.success) {
        setClients((res.data || []).filter((row: Client) => row.isActive !== false));
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    const res = await createContractAction({
      title,
      counterpartyId,
      startDate,
      endDate,
      description,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Договорът не беше записан.');
      return;
    }
    toast.success('Договорът е в Чернови.');
    router.push(`/${lang}/dashboard/contracts/${res.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Име *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Годишен договор" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Клиент</label>
        <select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Без клиент</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Начална дата</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Крайна дата</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Описание</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="По желание" />
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? 'Запис...' : 'Запиши договор'}</Button>
      </div>
    </div>
  );
}
