"use client";
import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Euro, PoundSterling, Calculator } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { syncRates, getCurrencyHistory } from './actions';
import { toast } from 'sonner';

export default function CurrenciesClient({ initialTrends }: { initialTrends: any[] }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [historyData, setHistoryData] = useState<any[]>([]);
  
  // Calculator state
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom] = useState('EUR');
  const [calcTo, setCalcTo] = useState('EUR');

  useEffect(() => {
    fetchHistory(selectedCurrency);
  }, [selectedCurrency]);

  const fetchHistory = async (currency: string) => {
    const data = await getCurrencyHistory(currency);
    setHistoryData(data);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    toast.promise(syncRates(), {
      loading: 'Синхронизиране с ЕЦБ...',
      success: 'Курсовете са обновени успешно!',
      error: 'Грешка при синхронизация'
    });
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const getIcon = (cur: string) => {
    if (cur === 'EUR') return <Euro size={24} />;
    if (cur === 'USD') return <DollarSign size={24} />;
    if (cur === 'GBP') return <PoundSterling size={24} />;
    return <DollarSign size={24} />;
  };

  const calculateConversion = () => {
    // If converting TO EUR
    if (calcTo === 'EUR' && calcFrom !== 'EUR') {
      const trend = initialTrends.find(t => t.currencyFrom === calcFrom);
      if (trend) {
        return (parseFloat(calcAmount || '0') * trend.currentRate).toFixed(2);
      }
    }
    // If converting FROM EUR
    if (calcFrom === 'EUR' && calcTo !== 'EUR') {
      const trend = initialTrends.find(t => t.currencyFrom === calcTo);
      if (trend) {
        return (parseFloat(calcAmount || '0') / trend.currentRate).toFixed(2);
      }
    }
    // Same currency
    if (calcFrom === calcTo) {
        return parseFloat(calcAmount || '0').toFixed(2);
    }
    return "0.00";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600/30 transition-all"
        >
          <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          Обнови курсовете
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {initialTrends.map(trend => (
          <div 
            key={trend.currencyFrom}
            onClick={() => setSelectedCurrency(trend.currencyFrom)}
            className={`bg-white/5 border rounded-2xl p-6 cursor-pointer transition-all ${
              selectedCurrency === trend.currencyFrom ? 'border-purple-500 shadow-lg shadow-purple-500/10' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${selectedCurrency === trend.currencyFrom ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white'}`}>
                  {getIcon(trend.currencyFrom)}
                </div>
                <div>
                  <div className="font-bold">{trend.currencyFrom} / {trend.currencyTo}</div>
                  <div className="text-xs text-zinc-400">Официален курс</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold tabular-nums">
                {trend.currentRate.toFixed(4)}
              </div>
              <div className={`flex items-center gap-1 text-sm ${trend.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(trend.changePercent).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            Графика (30 дни) - {selectedCurrency}/{initialTrends[0]?.currencyTo || 'EUR'}
          </h3>
          <div className="h-[300px] w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickMargin={10} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={12} width={50} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#a78bfa' }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                Зареждане на данни...
              </div>
            )}
          </div>
        </div>

        {/* Calculator */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calculator size={20} className="text-emerald-400" />
            Валутен Калкулатор
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Сума</label>
              <input 
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:border-emerald-500/50"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">От</label>
                <select 
                  value={calcFrom}
                  onChange={(e) => setCalcFrom(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
                >
                  <option value="EUR">EUR</option>
                  {initialTrends.map(t => <option key={t.currencyFrom} value={t.currencyFrom}>{t.currencyFrom}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Към</label>
                <select 
                  value={calcTo}
                  onChange={(e) => setCalcTo(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
                >
                  <option value="EUR">EUR</option>
                  {initialTrends.map(t => <option key={t.currencyFrom} value={t.currencyFrom}>{t.currencyFrom}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-6">
              <div className="text-sm text-zinc-400 mb-1">Резултат</div>
              <div className="text-3xl font-bold text-emerald-400 tabular-nums">
                {calculateConversion()} {calcTo}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
