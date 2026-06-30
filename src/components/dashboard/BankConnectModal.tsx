'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Landmark, ShieldCheck, Loader2 } from 'lucide-react';
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
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const params = useParams();
  const lang = String(params?.lang ?? 'bg');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'psd2' | 'demo' | null>(null);

  const handleDemoConnect = async () => {
    if (!selectedBank) return;

    setIsConnecting(true);
    const bankName = BANKS.find((b) => b.id === selectedBank)?.name || 'Unknown Bank';

    toast.info(`Демо: зареждане на транзакции от ${bankName}...`);
    setStep(2);

    setTimeout(async () => {
      const res = await seedMockBankingData(bankName);
      setIsConnecting(false);
      setStep(1);

      if (res.success) {
        toast.success(`Демо данни от ${bankName} са заредени.`);
        onSuccess();
        onClose();
      } else {
        toast.error('Грешка при свързване: ' + res.error);
      }
    }, 1500);
  };

  const handlePsd2Connect = async () => {
    if (!selectedBank) return;

    setIsConnecting(true);
    setStep(2);

    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankKey: selectedBank, lang }),
      });
      const data = await res.json();

      if (!res.ok || !data.link) {
        throw new Error(data.error || 'PSD2 connect failed');
      }

      window.location.href = data.link;
    } catch (error: unknown) {
      setIsConnecting(false);
      setStep(1);
      const message = error instanceof Error ? error.message : 'PSD2 connect failed';
      toast.error(message);
    }
  };

  const handleConnect = () => {
    if (mode === 'demo') handleDemoConnect();
    else handlePsd2Connect();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Свързване с банка</DialogTitle>
          <DialogDescription className="text-slate-400">
            PSD2 през Nordigen (GoCardless), или демо режим без API ключове.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'psd2' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('psd2')}
              >
                PSD2 (Nordigen)
              </Button>
              <Button
                type="button"
                variant={mode === 'demo' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setMode('demo')}
              >
                Демо данни
              </Button>
            </div>

            {mode && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {BANKS.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-3 ${
                        selectedBank === bank.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${bank.color}`}
                      >
                        <Landmark size={20} />
                      </div>
                      <span className="font-medium text-sm text-center">{bank.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  <ShieldCheck size={16} />
                  <span>
                    {mode === 'psd2'
                      ? 'Read-only PSD2 — без пароли. След одобрение в банката се връщате автоматично.'
                      : 'Демо режим — примерни транзакции за тест без реална банка.'}
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleConnect}
                    disabled={!selectedBank || isConnecting}
                    className="bg-violet-600 hover:bg-violet-700 w-full"
                  >
                    {mode === 'psd2' ? 'Продължи към банката' : 'Зареди демо данни'}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={48} className="text-violet-500 animate-spin" />
            <h3 className="text-lg font-medium text-center">Оторизация...</h3>
            <p className="text-sm text-slate-400 text-center">
              Пренасочване към банковия портал за потвърждение.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
