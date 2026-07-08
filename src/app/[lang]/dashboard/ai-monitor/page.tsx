'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inbox, AlertTriangle, CheckSquare, Activity, Bot, Clock, ShieldAlert, Brain, Zap } from 'lucide-react';
import { getAiMonitoringData } from './actions';

export default function AiMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getAiMonitoringData();
      if (res.success) setData(res.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-zinc-400">Зареждане...</div>;

  const formatDate = (d: string) => new Date(d).toLocaleString('bg-BG');

  const typeLabels: Record<string, string> = {
    duplicate_warning: 'Дублирани',
    missing_data: 'Липсващи данни',
    ai_approval_required: 'Чакащо одобрение',
    unmatched_transaction: 'Несъпоставени',
    expiring_document: 'Изтичащи документи',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    normal: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
    high: 'bg-amber-900/30 text-amber-400 border-amber-800/50',
    critical: 'bg-red-900/30 text-red-400 border-red-800/50',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot size={24} className="text-violet-400" />
            AI Мониторинг
          </h1>
          <p className="text-zinc-400 text-sm">Наблюдение на AI активност, аномалии и задачи</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0F1420] border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Отворени задачи</p>
                <p className="text-3xl font-bold text-white mt-1">{data.openInboxCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-900/30 border border-violet-800/50">
                <Inbox size={20} className="text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1420] border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Аномалии</p>
                <p className={`text-3xl font-bold mt-1 ${data.anomalyCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {data.anomalyCount}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${data.anomalyCount > 0 ? 'bg-amber-900/30 border-amber-800/50' : 'bg-emerald-900/30 border-emerald-800/50'}`}>
                <ShieldAlert size={20} className={data.anomalyCount > 0 ? 'text-amber-400' : 'text-emerald-400'} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1420] border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Чакащи задачи</p>
                <p className="text-3xl font-bold text-white mt-1">{data.pendingTasksCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-800/50">
                <CheckSquare size={20} className="text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1420] border-white/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Общо задачи</p>
                <p className="text-3xl font-bold text-white mt-1">{data.totalTasksCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-800/50">
                <Activity size={20} className="text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0F1420] border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Zap size={18} className="text-violet-400" />
              Задачи по тип
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.inboxByType).length === 0 ? (
              <p className="text-zinc-500 text-sm">Няма AI задачи</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.inboxByType).map(([type, counts]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-zinc-300 text-sm">{typeLabels[type] || type}</span>
                    <div className="flex items-center gap-3">
                      {counts.open > 0 && (
                        <span className="text-amber-400 text-sm font-medium">{counts.open} отворени</span>
                      )}
                      <span className="text-zinc-500 text-sm">({counts.total} общо)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0F1420] border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Brain size={18} className="text-violet-400" />
              Статус разпределение
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.inboxByStatus).length === 0 ? (
              <p className="text-zinc-500 text-sm">Няма данни</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.inboxByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-zinc-300 text-sm capitalize">{status}</span>
                    <Badge variant="outline" className={
                      status === 'open' ? 'bg-amber-900/30 text-amber-400 border-amber-800/50' :
                      status === 'accepted' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' :
                      status === 'rejected' ? 'bg-red-900/30 text-red-400 border-red-800/50' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }>
                      {String(count)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0F1420] border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Clock size={18} className="text-violet-400" />
            Последна активност
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-zinc-500 text-sm">Няма скорошна активност</p>
          ) : (
            <div className="space-y-2">
              {data.recentActivity.map((act: any) => (
                <div key={act.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <Activity size={14} className="text-zinc-500" />
                    <span className="text-zinc-300 text-sm">{act.action}</span>
                    <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                      {act.entityType}
                    </Badge>
                  </div>
                  <span className="text-zinc-500 text-xs">{formatDate(act.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#0F1420] border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Inbox size={18} className="text-violet-400" />
            Последни inbox елементи
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentInboxItems.length === 0 ? (
            <p className="text-zinc-500 text-sm">Няма inbox елементи</p>
          ) : (
            <div className="space-y-2">
              {data.recentInboxItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.type === 'duplicate_warning' || item.type === 'missing_data' ? (
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    ) : (
                      <Inbox size={14} className="text-violet-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-zinc-200 text-sm truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-zinc-500 text-xs truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${priorityColors[item.priority] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                      {item.priority}
                    </Badge>
                    <span className="text-zinc-500 text-xs">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
