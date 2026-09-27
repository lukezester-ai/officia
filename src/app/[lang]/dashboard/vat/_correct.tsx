'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { correctVatEik } from './actions';

export function CorrectEikButton({
  invoiceId,
  kind,
}: {
  invoiceId: string;
  kind: 'sales' | 'purchase';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eik, setEik] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await correctVatEik(kind, invoiceId, eik);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'ЕИК не е записан');
      return;
    }
    toast.success('ЕИК е записан');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        Коригирай
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        value={eik}
        onChange={(event) => setEik(event.target.value)}
        placeholder="123456789"
        className="h-8 w-32"
        autoFocus
      />
      <Button size="sm" className="h-8" onClick={save} disabled={saving}>
        {saving ? 'Записва...' : 'Запиши'}
      </Button>
    </div>
  );
}
