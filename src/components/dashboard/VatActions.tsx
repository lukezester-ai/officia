'use client';
// @ts-nocheck

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Landmark, FileText } from 'lucide-react';
import { NraSubmitModal } from './NraSubmitModal';
import { toast } from 'sonner';

export function VatActions() {
  const [isNraModalOpen, setIsNraModalOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const MONTHS = [
    'Януари','Февруари','Март','Април','Май','Юни',
    'Юли','Август','Септември','Октомври','Ноември','Декември',
  ];

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/accounting/vat-export?year=${year}&month=${month}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `DDS_${year}_${String(month).padStart(2,'0')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`ДДС файл за ${MONTHS[month-1]} ${year} е изтеглен!`);
      setIsDownloadOpen(false);
    } catch (e: any) {
      toast.error(`Грешка: ${e?.message}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex gap-3">
      {/* Download VAT export */}
      <Button
        variant="outline"
        onClick={() => setIsDownloadOpen(true)}
        className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"
      >
        <Download size={16} /> Изтегли (ZIP/TXT)
      </Button>

      {/* NRA submit */}
      <Button
        onClick={() => setIsNraModalOpen(true)}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50"
      >
        <Landmark size={16} /> Подай към НАП
      </Button>

      {/* Download period picker */}
      <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} className="text-indigo-400" />
              Изтегли ДДС файл
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-zinc-400">Изберете период за ДДС декларация (Дневник покупки + Дневник продажби)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Месец</label>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i+1} className="bg-zinc-900">{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Година</label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {[2023,2024,2025,2026].map(y => (
                    <option key={y} value={y} className="bg-zinc-900">{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-indigo-300">
              📄 Ще се генерира ZIP архив с файловете за НАП за {MONTHS[month-1]} {year}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDownloadOpen(false)} className="border-white/10 text-zinc-400">
              Отказ
            </Button>
            <Button onClick={handleDownload} disabled={downloading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Download size={15} />
              {downloading ? 'Генериране...' : 'Изтегли'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NraSubmitModal
        isOpen={isNraModalOpen}
        onClose={() => setIsNraModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
