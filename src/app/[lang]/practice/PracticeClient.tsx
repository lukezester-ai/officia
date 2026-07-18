'use client';

import { useState, useEffect } from 'react';
import { getPracticeOverview } from './actions';
import { Loader2, Building2, AlertTriangle, FileText, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PracticeClient() {
  const [firms, setFirms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getPracticeOverview();
    if (res.success && res.data) {
      // Сортиране: Фирмите с най-много проблеми излизат първи
      const sorted = res.data.sort((a: any, b: any) => {
        const scoreA = Number(a.alertsCount) * 10 + (a.cashflowStatus === 'critical' ? 50 : 0);
        const scoreB = Number(b.alertsCount) * 10 + (b.cashflowStatus === 'critical' ? 50 : 0);
        return scoreB - scoreA;
      });
      setFirms(sorted);
    }
    setLoading(false);
  };

  const setTenantAndRedirect = (tenantId: string) => {
    // В реално приложение тук се запазва избрания tenantId в cookie/localStorage 
    // и се пренасочва към дашборда
    document.cookie = `tenantId=${tenantId}; path=/`;
    router.push('/bg/dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <Loader2 className="animate-spin w-10 h-10 mb-4 text-violet-500" />
        <p className="text-lg">Зареждане на глобалното табло...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-zinc-400 text-sm font-medium mb-2">Обслужвани Фирми</div>
          <div className="text-3xl font-bold text-white">{firms.length}</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
          <div className="text-rose-400 text-sm font-medium mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Критични AI Аларми
          </div>
          <div className="text-3xl font-bold text-rose-500">
            {firms.reduce((acc, f) => acc + Number(f.alertsCount), 0)}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Клиентско Портфолио</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-zinc-400 text-sm">
                <th className="p-4 font-medium">Фирма Клиент</th>
                <th className="p-4 font-medium text-center">AI Аларми (Watchdog)</th>
                <th className="p-4 font-medium text-center">Чакащи Фактури</th>
                <th className="p-4 font-medium text-center">Прогноза Ликвидност</th>
                <th className="p-4 font-medium text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {firms.map((firm, idx) => {
                const isCritical = Number(firm.alertsCount) > 0 || firm.cashflowStatus === 'critical';
                
                return (
                  <tr key={firm.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    isCritical ? 'bg-rose-500/5' : ''
                  }`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-violet-500/20 text-violet-400'
                        }`}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-base">{firm.name}</div>
                          <div className="text-xs text-zinc-500">ЕИК: {firm.bulstat || 'Няма'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {Number(firm.alertsCount) > 0 ? (
                        <span className="inline-flex items-center justify-center bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full gap-1">
                          <AlertTriangle size={12} /> {firm.alertsCount}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-300">
                        <FileText size={16} className="text-zinc-500" />
                        {firm.pendingInvoices}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {firm.cashflowStatus === 'critical' ? (
                        <span className="text-rose-400 flex items-center justify-center gap-1 text-sm font-medium">
                          <TrendingDown size={16} /> На червено
                        </span>
                      ) : firm.cashflowStatus === 'warning' ? (
                        <span className="text-amber-400 text-sm font-medium">Внимание</span>
                      ) : (
                        <span className="text-emerald-400 text-sm font-medium">Стабилна</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setTenantAndRedirect(firm.id)}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Вход <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
