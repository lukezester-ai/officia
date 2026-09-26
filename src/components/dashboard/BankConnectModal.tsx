'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createBankAccount } from '@/app/[lang]/dashboard/banking/actions';

export function BankConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await createBankAccount({ name, iban, currency });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Сметката не беше записана.');
      return;
    }
    toast.success('Сметката е записана. Движенията влизат с качено извлечение.');
    setName('');
    setIban('');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Фирмена сметка</DialogTitle>
          <DialogDescription className="text-slate-400">
            Записваме вашия IBAN. Живо теглене от банката (PSD2) още не е включено.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Банка, напр. УниКредит Булбанк" className="bg-slate-900 border-slate-700" />
          <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="BG IBAN" className="bg-slate-900 border-slate-700 font-mono" />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
            <option value="EUR">EUR</option>
            <option value="BGN">BGN</option>
          </select>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700">
            {saving ? 'Запис...' : 'Запази сметката'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
