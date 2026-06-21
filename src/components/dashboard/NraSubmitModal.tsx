'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, FileCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function NraSubmitModal({ 
  isOpen, 
  onClose,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleSignAndSubmit = () => {
    setStep(2);
    
    // Simulate KEP signature and NRA upload
    setTimeout(() => {
      setStep(3);
      toast.success('Успешно подадени ДДС дневници към НАП!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep(1);
      }, 3000);
    }, 4000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && step !== 2) onClose();
    }}>
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="text-indigo-500" />
            Портал за електронни услуги на НАП
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Подаване на Справка-декларация по ЗДДС и Дневници на покупки и продажби.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4 space-y-6">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 flex items-start gap-3">
              <FileCheck className="text-emerald-500 mt-1" size={20} />
              <div>
                <p className="font-medium text-sm">Файлове за подаване:</p>
                <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc pl-4">
                  <li>dec.txt (Справка-декларация)</li>
                  <li>pok.txt (Дневник на покупките)</li>
                  <li>pro.txt (Дневник на продажбите)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <span>Изисква се Квалифициран електронен подпис (КЕП).</span>
            </div>

            <div className="flex justify-end pt-2 gap-3">
              <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">
                Отказ
              </Button>
              <Button 
                onClick={handleSignAndSubmit} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Подпиши с КЕП и Подай
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={48} className="text-indigo-500 animate-spin" />
            <h3 className="text-lg font-medium text-center text-indigo-100">Подписване на документите...</h3>
            <p className="text-sm text-slate-400 text-center animate-pulse">Осъществяване на защитена връзка със сървърите на НАП.</p>
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
              <p className="font-mono text-sm font-semibold">1234567890 / {new Date().toLocaleDateString('bg-BG')}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
