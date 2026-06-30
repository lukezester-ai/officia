'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Loader2, FileCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type SubmitResult = {
  success: boolean;
  mode?: 'live' | 'mock' | 'disabled';
  referenceNumber?: string;
  error?: string;
  year?: number;
  month?: number;
};

export function NraSubmitModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [step, setStep] = useState<1 | 2 | 3 | 'error'>(1);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setReferenceNumber(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (step === 2) return;
    onClose();
    reset();
  };

  const handleSignAndSubmit = async () => {
    setStep(2);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/vat/nap-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });
      const result: SubmitResult = await response.json();

      if (!response.ok || !result.success) {
        setStep('error');
        setErrorMessage(result.error || 'NAP submission failed');
        toast.error(result.error || 'NAP submission failed');
        return;
      }

      setReferenceNumber(result.referenceNumber || `NAP_${Date.now()}`);
      setStep(3);
      toast.success(
        result.mode === 'mock'
          ? 'Mock submission accepted (NAP_MOCK_MODE).'
          : 'Успешно подадени ДДС дневници към НАП!',
      );
      setTimeout(() => {
        onSuccess();
        onClose();
        reset();
      }, 2500);
    } catch (error: unknown) {
      setStep('error');
      const message = error instanceof Error ? error.message : 'Network error';
      setErrorMessage(message);
      toast.error('Грешка при връзка с НАП');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="text-indigo-500" />
            Портал за електронни услуги на НАП
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Генерира ZIP (PRODAJBI/POKUPKI/DEKLAR) и го качва директно към НАП (mTLS) или mock режим.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Година</label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Месец</label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 flex items-start gap-3">
              <FileCheck className="text-emerald-500 mt-1" size={20} />
              <div>
                <p className="font-medium text-sm">Файлове за подаване:</p>
                <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc pl-4">
                  <li>DEKLAR.TXT (Справка-декларация)</li>
                  <li>POKUPKI.TXT (Дневник на покупките)</li>
                  <li>PRODAJBI.TXT (Дневник на продажбите)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <span>Live режим изисква NAP_ENABLED=true и КЕП сертификати. Иначе NAP_MOCK_MODE=true.</span>
            </div>

            <div className="flex justify-end pt-2 gap-3">
              <Button variant="ghost" onClick={handleClose} className="hover:bg-slate-800">
                Отказ
              </Button>
              <Button onClick={handleSignAndSubmit} className="bg-indigo-600 hover:bg-indigo-700">
                Генерирай ZIP и Подай
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={48} className="text-indigo-500 animate-spin" />
            <h3 className="text-lg font-medium text-center text-indigo-100">Подаване към НАП...</h3>
            <p className="text-sm text-slate-400 text-center">Генериране на ZIP и качване.</p>
          </div>
        )}

        {step === 3 && (
          <div className="py-10 flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-medium text-center text-emerald-400">Успешно приемане</h3>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-center w-full mt-4">
              <p className="text-xs text-slate-500 mb-1">Входящ номер от НАП:</p>
              <p className="font-mono text-sm font-semibold">
                {referenceNumber} / {new Date().toLocaleDateString('bg-BG')}
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>
            <p className="text-sm text-slate-300 text-center px-2">{errorMessage}</p>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} className="hover:bg-slate-800">
                Затвори
              </Button>
              <Button onClick={() => setStep(1)} className="bg-indigo-600 hover:bg-indigo-700">
                Опитай отново
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
