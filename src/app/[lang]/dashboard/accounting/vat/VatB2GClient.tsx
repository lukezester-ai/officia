'use client';
import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VatB2GClient({ period }: { period: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignAndSubmit = async () => {
    if (!confirm('Сигурни ли сте, че искате да изпратите ДДС декларацията за КЕП подпис на телефона си и да я подадете към НАП?')) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/nap/sign-and-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, type: 'vat' }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Грешка при комуникация с НАП');
      }
      
      setSuccess(true);
      setReceipt(data.receiptNumber || 'Вх. № 1234567');
      router.refresh();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-500/20 print:hidden">
        <CheckCircle size={16} /> Подадена (Вх. № {receipt})
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      {error && (
        <div className="flex items-center gap-1 text-red-400 text-xs px-2">
          <AlertCircle size={12} /> {error}
        </div>
      )}
      <button
        onClick={handleSignAndSubmit}
        disabled={loading}
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-all px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Очаква КЕП подпис...
          </>
        ) : (
          <>
            <Send size={14} /> Подпиши и подай
          </>
        )}
      </button>
    </div>
  );
}
