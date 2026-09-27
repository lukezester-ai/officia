'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
];

export function NraSubmitModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/accounting/vat-export?year=${year}&month=${month}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NAP_VAT_${year}_${String(month).padStart(2, '0')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Файлът за ${MONTHS[month - 1]} ${year} е изтеглен. Качването е в портала на НАП.`);
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Файлът не беше изтеглен.';
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[450px] bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileCheck className="text-indigo-500" />
            Файл за портала на НАП
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Officia подготвя дневниците. Не ги изпраща към НАП и не получава входящ номер.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Месец</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1} className="bg-zinc-900">{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Година</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y} className="bg-zinc-900">{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 text-sm text-slate-300">
            ZIP за {MONTHS[month - 1]} {year} се качва ръчно в портала на НАП.
          </div>

          <div className="flex justify-end pt-2 gap-3">
            <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">
              Отказ
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Download size={15} />
              {downloading ? 'Генериране...' : 'Изтегли ZIP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
