// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, ShieldCheck, Zap, AlertTriangle, CheckCircle2, 
  RefreshCw, Layers, Cpu, Clock, BarChart3, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { getAgentManagerStatusAction } from './agent-manager-actions';
import ReactMarkdown from 'react-markdown';

export function AgentManagerPanel() {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getAgentManagerStatusAction();
      if (res.success) {
        setReport(res);
      } else {
        toast.error('Грешка при зареждане на Agent Manager: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Грешка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (!report && loading) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 text-zinc-400 flex items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-indigo-400" size={20} />
        <span>Agent Manager сканира всички специализирани AI агенти...</span>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Supervisor Score */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">AI Agent Manager</h2>
                <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold px-2.5 py-0.5">
                  Супервайзър & Диригент
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Централна система за контрол, която следи дали всички останали AI агенти в Officia работят правилно, помага им при грешки и координира данните между тях.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="text-right border-r border-white/10 pr-4">
              <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Системно здраве</span>
              <span className="text-2xl font-black text-emerald-400 flex items-center gap-1 justify-end">
                <Zap size={18} className="animate-pulse text-emerald-400" /> {report.systemHealthScore}%
              </span>
            </div>
            <Button
              onClick={fetchStatus}
              disabled={loading}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Проверка...' : 'Диагностика'}
            </Button>
          </div>
        </div>
      </div>

      {/* Executive Summary Narrative */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm leading-relaxed text-zinc-300 prose prose-invert max-w-none">
        <ReactMarkdown>{report.executiveSummary}</ReactMarkdown>
      </div>

      {/* 6 Specialized AI Agents Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Layers size={16} className="text-indigo-400" /> Подчинени автономни агенти ({report.activeAgentsCount})
          </h3>
          <span className="text-xs text-zinc-500">Обновява се в реално време при всяка операция</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.agents.map((agent: any) => (
            <Card key={agent.id} className="bg-slate-900/80 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between overflow-hidden shadow-md">
              <CardHeader className="pb-3 pt-4 px-4 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
                      <Bot size={18} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-white leading-tight">{agent.name}</CardTitle>
                      <span className="text-[10px] text-zinc-400 block line-clamp-1 mt-0.5">{agent.role}</span>
                    </div>
                  </div>
                  <Badge className={`text-[10px] uppercase font-bold shrink-0 ${
                    agent.status === 'online' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    agent.status === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                    'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Здраве: <strong className="text-white">{agent.healthScore}%</strong></span>
                    <span>Грешки: <strong className="text-rose-400">{agent.errorRate}</strong></span>
                    <span>24ч: <strong className="text-indigo-300">{agent.tasksCompletedLast24h}</strong></span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${agent.healthScore > 95 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                      style={{ width: `${agent.healthScore}%` }} 
                    />
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1 flex items-center gap-1">
                      <BarChart3 size={12} className="text-indigo-400" /> Активна задача / Мониторинг:
                    </span>
                    <p className="text-zinc-200 leading-snug">{agent.currentTask}</p>
                  </div>

                  {agent.lastIntervention && (
                    <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded border border-amber-500/20 leading-tight">
                      <b>⚡ Намеса:</b> {agent.lastIntervention}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1 mt-auto">
                  {agent.capabilities?.map((cap: string) => (
                    <span key={cap} className="px-2 py-0.5 rounded text-[9px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {cap}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Interventions & Autonomous Actions Log */}
      {report.interventionsLog?.length > 0 && (
        <Card className="bg-slate-900 border border-white/10 shadow-lg">
          <CardHeader className="pb-3 bg-white/[0.02] border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" /> Дневник на автономните намеси на Agent Manager
            </CardTitle>
            <span className="text-xs text-zinc-500">Авто-корекции и ескалации</span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {report.interventionsLog.map((log: any) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  log.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  log.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {log.severity === 'warning' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{log.targetAgent}</span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock size={11} /> {new Date(log.timestamp).toLocaleTimeString('bg-BG')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{log.actionTaken}</p>
                  <div className="text-[11px] text-emerald-400 font-medium pt-1 border-t border-white/5">
                    ✔ <b>Резултат:</b> {log.result}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
