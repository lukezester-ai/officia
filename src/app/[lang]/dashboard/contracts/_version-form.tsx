'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from '@/components/icons';
import { toast } from 'sonner';
import { addContractFileAction } from './actions';

export function ContractVersionForm({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [versionNumber, setVersionNumber] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!file) {
      toast.error('Избери файл.');
      return;
    }
    const body = new FormData();
    body.set('file', file);
    body.set('versionNumber', versionNumber);
    setSaving(true);
    const res = await addContractFileAction(contractId, body);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Файлът не беше качен.');
      return;
    }
    setFile(null);
    toast.success('Файлът е качен.');
    router.refresh();
  }

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Версия</label>
        <Input value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Файл</label>
        <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <Button onClick={save} disabled={saving} variant="outline" className="gap-2">
        <Upload className="h-4 w-4" /> {saving ? 'Качва...' : 'Качи версия'}
      </Button>
    </div>
  );
}
