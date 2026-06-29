"use client";
import React, { useState } from 'react';
import { Upload, Check, X, BrainCircuit, Receipt, ArrowRight, CheckCircle2 } from 'lucide-react';
import { uploadBankStatement, confirmMatch } from './actions';
import { BankStatementParser } from '@/lib/accounting/bank-parser';
import { toast } from 'sonner';

export default function ReconciliationClient({ initialSuggestions }: { initialSuggestions: any[] }) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      const parsed = BankStatementParser.parseCSV(csvText);
      
      const res = await uploadBankStatement(parsed);
      if (res.success) {
        toast.success(`Успешно качени ${res.count} транзакции`);
        window.location.reload(); // Reload to fetch new suggestions from Server
      } else {
        toast.error("Грешка при качване");
      }
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleConfirm = async (txId: string, type: 'invoice'|'expense', matchId: string|number) => {
    toast.promise(confirmMatch(txId, type, matchId), {
      loading: 'Равняване...',
      success: () => {
        setSuggestions(prev => prev.filter(s => s.transaction.id !== txId));
        return 'Успешно равнено!';
      },
      error: 'Грешка при равняване',
    });
  };

  const handleReject = (txId: string) => {
    setSuggestions(prev => prev.filter(s => s.transaction.id !== txId));
    toast.info("Предложението е отхвърлено");
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload size={18} className="text-emerald-400" />
            Качи Банково Извлечение
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Поддържа CSV формати. Алгоритъмът автоматично ще мапне колоните.</p>
        </div>
        <label className="relative overflow-hidden cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-all">
          {isUploading ? "Обработка..." : "Избери Файл"}
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* Tinder-style Matches */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BrainCircuit size={20} className="text-purple-400" /> 
          Предложени Съвпадения ({suggestions.length})
        </h3>
        
        {suggestions.length === 0 && (
          <div className="text-center py-12 bg-white/3 border border-white/5 rounded-2xl">
            <CheckCircle2 size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Всички транзакции са равнени!</p>
          </div>
        )}

        <div className="grid gap-4">
          {suggestions.map((sugg, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-6 group hover:border-white/20 transition-all">
              
              {/* Left: Bank Transaction */}
              <div className="flex-1">
                <div className="text-xs text-zinc-500 mb-1">БАНКОВА ТРАНЗАКЦИЯ</div>
                <div className="font-medium">{sugg.transaction.counterpartyName || 'Неизвестен наредител'}</div>
                <div className="text-sm text-zinc-400">{sugg.transaction.description || '-'}</div>
                <div className="text-lg font-bold mt-2 tabular-nums">
                  {Number(sugg.transaction.amount).toFixed(2)} EUR
                </div>
              </div>

              {/* Middle: AI Confidence */}
              <div className="flex flex-col items-center justify-center w-32 px-4 border-x border-white/10">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                  <BrainCircuit size={12} /> {sugg.confidence}% Мач
                </div>
                <ArrowRight size={20} className="text-zinc-600" />
                <div className="text-[10px] text-zinc-500 mt-2 text-center">{sugg.reason}</div>
              </div>

              {/* Right: Invoice/Expense */}
              <div className="flex-1">
                <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <Receipt size={12} /> СЪСТАВЕН ДОКУМЕНТ
                </div>
                <div className="font-medium">
                  {sugg.type === 'invoice' ? 'Фактура' : 'Разход'} #{sugg.type === 'invoice' ? sugg.target.invoiceNumber : 'N/A'}
                </div>
                <div className="text-sm text-zinc-400">
                  {sugg.type === 'invoice' ? sugg.target.clientName : sugg.target.description}
                </div>
                <div className="text-lg font-bold mt-2 tabular-nums text-emerald-400">
                  {Number(sugg.type === 'invoice' ? sugg.target.total : sugg.target.amount).toFixed(2)} EUR
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleConfirm(sugg.transaction.id, sugg.type, sugg.matchId)}
                  className="w-12 h-12 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 flex items-center justify-center transition-all"
                  title="Потвърди"
                >
                  <Check size={24} />
                </button>
                <button 
                  onClick={() => handleReject(sugg.transaction.id)}
                  className="w-12 h-12 rounded-full bg-red-500/10 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-all"
                  title="Отхвърли"
                >
                  <X size={20} />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
