'use client';

import { useState, useEffect } from 'react';
import { getPredictiveCashflow } from './actions';
import { Loader2, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function CashflowClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getPredictiveCashflow();
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="animate-spin w-8 h-8 mb-4 text-violet-500" />
        <p>AI изчислява вашата ликвидност...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-rose-400 p-6">Грешка при зареждане на данните.</div>;
  }

  const {
    currentBalance,
    incomingCash,
    outgoingCash,
    predictedBalance,
    status,
    aiAdvice,
    criticalReceivables
  } = data;

  const isCritical = status === 'critical';
  const isWarning = status === 'warning';
  const isHealthy = status === 'healthy';

  return (
    <div className="space-y-6">
      {/* AI Advice Banner */}
      <div className={`p-6 rounded-2xl border flex gap-4 items-start ${
        isCritical ? 'bg-rose-500/10 border-rose-500/30' : 
        isWarning ? 'bg-amber-500/10 border-amber-500/30' : 
        'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div className="mt-1">
          {isCritical ? <AlertTriangle className="text-rose-400" size={24} /> : 
           isWarning ? <AlertTriangle className="text-amber-400" size={24} /> : 
           <CheckCircle className="text-emerald-400" size={24} />}
        </div>
        <div>
          <h3 className={`text-lg font-bold mb-1 ${
            isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
          }`}>AI Анализ на Ликвидността</h3>
          <p className="text-zinc-300">{aiAdvice}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-zinc-400 text-sm font-medium mb-2 flex items-center gap-2">
            <DollarSign size={16} /> Текущи Наличности
          </div>
          <div className="text-2xl font-bold text-white">{currentBalance.toFixed(2)} лв.</div>
        </div>

        {/* Incoming */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-emerald-400 text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp size={16} /> Очаквани Постъпления
          </div>
          <div className="text-2xl font-bold text-emerald-400">+{incomingCash.toFixed(2)} лв.</div>
        </div>

        {/* Outgoing */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-rose-400 text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingDown size={16} /> Очаквани Разходи
          </div>
          <div className="text-2xl font-bold text-rose-400">-{outgoingCash.toFixed(2)} лв.</div>
        </div>

        {/* Predicted Balance */}
        <div className={`border rounded-2xl p-6 ${
          predictedBalance < 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-violet-500/10 border-violet-500/30'
        }`}>
          <div className={`text-sm font-medium mb-2 ${
            predictedBalance < 0 ? 'text-rose-400' : 'text-violet-300'
          }`}>
            Прогнозен Баланс (30 дни)
          </div>
          <div className={`text-3xl font-black ${
            predictedBalance < 0 ? 'text-rose-500' : 'text-white'
          }`}>
            {predictedBalance.toFixed(2)} лв.
          </div>
        </div>
      </div>

      {/* Critical Receivables */}
      {criticalReceivables && criticalReceivables.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Критични вземания за събиране</h3>
          <div className="space-y-3">
            {criticalReceivables.map((rec: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div>
                  <div className="text-white font-medium">Фактура № {rec.invoiceNumber}</div>
                  <div className="text-zinc-400 text-sm">{rec.counterpartyName}</div>
                </div>
                <div className="text-emerald-400 font-bold">
                  {parseFloat(rec.totalAmount).toFixed(2)} лв.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
