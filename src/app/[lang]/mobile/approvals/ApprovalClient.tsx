'use client';

import { useState, useEffect } from 'react';
import { getPendingApprovals, approveInvoice, rejectInvoice } from './actions';
import { Check, X, ArrowLeft, Loader2, FileText, Calendar, Building, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ApprovalClient() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'approve' | 'reject' | null
  const router = useRouter();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const res = await getPendingApprovals();
    if (res.success && res.data) {
      setInvoices(res.data);
    }
    setLoading(false);
  };

  const handleApprove = async (id: number) => {
    setActionLoading('approve');
    await approveInvoice(id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setActionLoading(null);
  };

  const handleReject = async (id: number) => {
    setActionLoading('reject');
    await rejectInvoice(id, 'Отхвърлена през мобилния портал');
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-zinc-400">
        <Loader2 className="animate-spin w-8 h-8 mb-4 text-violet-500" />
        <p>Зареждане на чакащи одобрения...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <Check size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Всичко е изчистено!</h2>
        <p className="text-zinc-400 mb-8">Нямате чакащи фактури за одобрение.</p>
        <Link 
          href="/bg/dashboard/accounting" 
          className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white font-medium transition-colors"
        >
          Към Таблото
        </Link>
      </div>
    );
  }

  const currentInvoice = invoices[0];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
        <Link href="/bg/dashboard/accounting" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white">
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <h1 className="font-bold text-lg text-white">Одобрения</h1>
          <p className="text-xs text-zinc-400">{invoices.length} оставащи</p>
        </div>
        <div className="w-10 h-10" />
      </div>

      {/* Card (Tinder-like UI) */}
      <div className="flex-1 flex flex-col p-4 relative justify-center">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 blur-[60px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <FileText size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Фактура № {currentInvoice.invoiceNumber || currentInvoice.id}</h2>
              <p className="text-sm text-zinc-400 uppercase tracking-wider">{currentInvoice.type === 'purchase' ? 'Покупка' : 'Продажба'}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8 relative z-10">
            <div className="flex items-center gap-3 text-zinc-300">
              <Building size={16} className="text-zinc-500" />
              <span className="font-medium text-white">{currentInvoice.counterpartyName || 'Неизвестен контрагент'}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <Calendar size={16} className="text-zinc-500" />
              <span>{currentInvoice.issueDate ? new Date(currentInvoice.issueDate).toLocaleDateString('bg-BG') : 'Няма дата'}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-zinc-400" />
              <span className="text-zinc-400 font-medium">Сума:</span>
            </div>
            <span className="text-2xl font-bold text-white">{parseFloat(currentInvoice.totalAmount || '0').toFixed(2)} лв.</span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent flex items-center justify-center gap-6 z-20">
        <button
          onClick={() => handleReject(currentInvoice.id)}
          disabled={!!actionLoading}
          className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:scale-100"
        >
          {actionLoading === 'reject' ? <Loader2 size={32} className="animate-spin" /> : <X size={36} strokeWidth={2.5} />}
        </button>

        <button
          onClick={() => handleApprove(currentInvoice.id)}
          disabled={!!actionLoading}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-400/50 flex items-center justify-center text-white hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
        >
          {actionLoading === 'approve' ? <Loader2 size={40} className="animate-spin" /> : <Check size={48} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
