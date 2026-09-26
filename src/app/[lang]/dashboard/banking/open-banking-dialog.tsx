'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { listOpenBankingInstitutions, startOpenBanking } from './open-banking';

type Institution = { id: string; name: string; logo: string };

export function OpenBankingDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Institution[] | null>(null);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [starting, setStarting] = useState('');

  async function load() {
    setLoading(true);
    const res = await listOpenBankingInstitutions();
    setLoading(false);
    if (!res.success) {
      setBanks([]);
      setNotice(res.error);
      return;
    }
    setNotice('');
    setBanks(res.data);
  }

  async function connect(bank: Institution) {
    const lang = window.location.pathname.split('/').filter(Boolean)[0] || 'bg';
    setStarting(bank.id);
    const res = await startOpenBanking(lang, bank.id, bank.name);
    setStarting('');
    if (!res.success || !res.link) {
      toast.error(res.error || 'Връзката не тръгна.');
      return;
    }
    window.location.href = res.link;
  }

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen]);

  const shown = (banks ?? []).filter((bank) => bank.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Свържи банка</DialogTitle>
          <DialogDescription className="text-slate-400">
            Входът е в страницата на банката. Officia получава салдо и движения за последните 90 дни.
          </DialogDescription>
        </DialogHeader>
        {loading && <p className="text-sm text-slate-400">Зареждане на банките...</p>}
        {!loading && notice && <p className="text-sm text-amber-300">{notice}</p>}
        {!loading && banks && banks.length > 0 && (
          <div className="space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Търси банка" className="bg-slate-900 border-slate-700" />
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {shown.map((bank) => (
                <li key={bank.id}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={starting === bank.id}
                    onClick={() => { void connect(bank); }}
                    className="h-auto w-full justify-start gap-3 border-white/10 bg-white/5 py-2 text-white hover:bg-white/10"
                  >
                    {bank.logo ? (
                      // Bank logos come from GoCardless and are not in the local image set.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bank.logo} alt="" className="h-6 w-6 rounded-sm bg-white object-contain" />
                    ) : null}
                    <span>{starting === bank.id ? 'Отваряне...' : bank.name}</span>
                  </Button>
                </li>
              ))}
            </ul>
            {shown.length === 0 && <p className="text-sm text-slate-400">Няма банка с това име.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
