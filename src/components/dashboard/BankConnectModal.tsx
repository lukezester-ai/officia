'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Landmark, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { seedMockBankingData } from '@/app/[lang]/dashboard/banking/actions';

const BANKS = [
  { id: 'unicredit', name: 'UniCredit Bulbank', color: 'bg-red-500' },
  { id: 'dsk', name: 'Банка ДСК', color: 'bg-emerald-600' },
  { id: 'revolut', name: 'Revolut', color: 'bg-black' },
  { id: 'kbc', name: 'KBC Bank', color: 'bg-blue-500' },
];

export function BankConnectModal({ 
  isOpen, 
  onClose,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleConnect = async () => {
    if (!selectedBank) return;
    
    setIsConnecting(true);
    const bankName = BANKS.find(b => b.id === selectedBank)?.name || 'Unknown Bank';

    // Fake OAuth redirect simulation
    toast.info(`Пренасочване към портала на ${bankName} (PSD2)...`);
    setStep(2);
    
    setTimeout(async () => {
      const res = await seedMockBankingData(bankName);
      setIsConnecting(false);
      setStep(1);
      
      if (res.success) {
        toast.success(`Успешно свързване с ${bankName}! Изтеглени са нови транзакции.`);
        onSuccess();
        onClose();
      } else {
        toast.error('Грешка при свързване: ' + res.error);
      }
    }, 2500); // simulate 2.5s network delay
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Свързване на Банка (Отворено банкиране)</DialogTitle>
          <DialogDescription className="text-slate-400">
            Изберете вашата банка. Връзката е защитена чрез европейската директива PSD2.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {BANKS.map(bank => (
                <div 
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-3 ${
                    selectedBank === bank.id 
                      ? 'border-violet-500 bg-violet-500/10' 
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${bank.color}`}>
                    <Landmark size={20} />
                  </div>
                  <span className="font-medium text-sm text-center">{bank.name}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <ShieldCheck size={16} />
              <span>Криптирана връзка без достъп до вашите пароли. Четем само транзакции.</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleConnect} 
                disabled={!selectedBank || isConnecting}
                className="bg-violet-600 hover:bg-violet-700 w-full"
              >
                Продължи към Банката
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={48} className="text-violet-500 animate-spin" />
            <h3 className="text-lg font-medium text-center">Оторизация...</h3>
            <p className="text-sm text-slate-400 text-center">Моля, изчакайте докато банката потвърди достъпа ви.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
