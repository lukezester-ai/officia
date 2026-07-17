'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Zap, ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { runAiLedgerAuditAction } from './actions';
import ReactMarkdown from 'react-markdown';

export function AccountingActionButtons({ lang }: { lang: string }) {
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleRunAudit = async () => {
    setLoadingAudit(true);
    toast.loading('AI Одиторът анализира главната книга, ДДС и дублирани записи...');
    try {
      const res = await runAiLedgerAuditAction();
      toast.dismiss();
      if (res.success) {
        setAuditResult(res);
        setShowModal(true);
        if (res.anomaliesFound > 0) {
          toast.warning(`AI Одитът завърши: Открити са ${res.anomaliesFound} аномалии!`);
        } else {
          toast.success('AI Одитът завърши: Всички записи са коректни и балансирани!');
        }
      } else {
        toast.error('Грешка при AI Одита: ' + res.error);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error('Грешка: ' + err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="gap-2 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 font-medium"
          onClick={handleRunAudit}
          disabled={loadingAudit}
        >
          <ShieldCheck size={16} className="text-indigo-400 animate-pulse" />
          {loadingAudit ? 'Одит в ход...' : 'AI Одит на Главна Книга'}
        </Button>
        <Link href={`/${lang}/dashboard/accounting/journal/new`}>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            <Plus size={16} /> Нов запис
          </Button>
        </Link>
      </div>

      {showModal && auditResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${auditResult.anomaliesFound > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {auditResult.anomaliesFound > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Одит на Счетоводната Главна Книга</h3>
                  <p className="text-xs text-zinc-400">Проверени: {auditResult.totalChecked} документа и статии</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm leading-relaxed prose prose-invert max-w-none">
                <ReactMarkdown>{auditResult.auditNarrative}</ReactMarkdown>
              </div>

              {auditResult.anomaliesFound > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Списък с идентифицирани аномалии:</h4>
                  {auditResult.anomalies.map((a: any) => (
                    <div key={a.id} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-rose-400 flex items-center gap-2">
                          <AlertTriangle size={14} /> {a.title}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300"><b>Документ:</b> {a.documentRef}</p>
                      <p className="text-xs text-zinc-400">{a.description}</p>
                      <div className="pt-2 mt-2 border-t border-white/5 text-xs text-indigo-300">
                        <b>💡 AI Препоръка:</b> {a.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex justify-end">
              <Button onClick={() => setShowModal(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6">
                Затвори доклада
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
