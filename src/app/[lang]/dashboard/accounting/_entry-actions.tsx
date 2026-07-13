'use client';
// @ts-nocheck

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { postInvoiceToJournal, confirmJournalEntry } from './actions';

export function EntryActionButtons({ id, type }: { id: string, type: 'invoice' | 'journal' }) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const res = type === 'invoice' 
      ? await postInvoiceToJournal(id, '411')
      : await confirmJournalEntry(id);

    if (res?.success) {
      toast.success(type === 'invoice' ? 'Фактурата е осчетоводявана успешно!' : 'Записът е потвърден!');
    } else {
      toast.error('Грешка: ' + (res?.error || 'Неизвестна грешка'));
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        disabled={loading}
        onClick={handleAccept}
        className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
      >
        <CheckCircle size={14} className="mr-1.5" />
        {loading ? 'Обработка...' : 'Приеми / Осчетоводи'}
      </Button>
    </div>
  );
}
