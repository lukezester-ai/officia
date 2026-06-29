'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Scan, UploadCloud, BrainCircuit, CheckCircle2, FileDigit, Loader2, Sparkles } from 'lucide-react';
import { createPurchaseInvoice } from './actions-read';
import { toast } from 'sonner';

const stepsText = [
  'Инициализиране на OCR енджин...',
  'Извличане на данни за доставчик...',
  'Засичане на IBAN и суми...',
  'Калкулиране на ДДС ставки...',
  'Генериране на счетоводни статии...',
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AiScannerDialog({ onScanned }: { onScanned: () => void }) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (file: File) => {
    setStep(1);
    setScanning(true);

    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'OCR scan failed');
      }

      const ocr = await res.json();
      const total = parseFloat(ocr.totalAmount || '0');
      const net = total > 0 ? (total / 1.2).toFixed(2) : '0.00';
      const vat = total > 0 ? (total - parseFloat(net)).toFixed(2) : '0.00';
      const issueDate = ocr.date || new Date().toISOString().split('T')[0];

      setExtractedData({
        supplierName: ocr.counterpartyName || ocr.supplierName || 'Неизвестен доставчик',
        supplierEik: ocr.eik || ocr.supplierEik || '',
        invoiceNumber: ocr.invoiceNumber || `INV-${Date.now()}`,
        issueDate,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        netAmount: net,
        vatAmount: vat,
        totalAmount: total.toFixed(2),
        extractedText: ocr.extractedText,
      });
      setStep(2);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Грешка при OCR сканиране');
      setStep(0);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;

    const res = await createPurchaseInvoice({
      supplierName: extractedData.supplierName,
      supplierEik: extractedData.supplierEik,
      invoiceNumber: extractedData.invoiceNumber,
      issueDate: extractedData.issueDate,
      dueDate: extractedData.dueDate,
      lines: [
        {
          description: extractedData.extractedText || 'Стоки/услуги по фактура',
          quantity: 1,
          unitPrice: parseFloat(extractedData.netAmount) || 0,
          vatRate: 20,
        },
      ],
    });

    if (res.success) {
      toast.success('Фактурата е успешно създадена от AI!');
      setOpen(false);
      onScanned();
      setTimeout(() => {
        setStep(0);
        setExtractedData(null);
      }, 500);
    } else {
      toast.error('Грешка при запис: ' + res.error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setTimeout(() => {
            setStep(0);
            setExtractedData(null);
          }, 300);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-[0_0_15px_rgba(192,38,211,0.4)] border border-fuchsia-500/50">
          <Scan size={16} /> Сканирай Фактура (AI)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-white/10 text-zinc-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Sparkles className="text-fuchsia-400" size={20} />
            AI Извличане на Данни (OCR)
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Качете снимка или PDF на фактура. Нашият изкуствен интелект ще извлече всички данни автоматично.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = '';
          }}
        />

        <div className="py-6">
          {step === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-fuchsia-500/20 group-hover:text-fuchsia-400">
                <UploadCloud size={32} />
              </div>
              <p className="text-lg font-medium text-white mb-1">Кликнете или плъзнете файл тук</p>
              <p className="text-sm text-zinc-500">Поддържа PDF, JPG, PNG (до 10MB)</p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-10 space-y-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(192,38,211,0.2)]">
                  <FileDigit size={40} className="text-fuchsia-400" />
                </div>
                <div className="absolute top-0 left-0 w-full h-1 bg-fuchsia-500 shadow-[0_0_15px_#d946ef] animate-[scan_2s_ease-in-out_infinite]" />
              </div>

              <div className="space-y-3 w-full max-w-[280px]">
                {stepsText.map((text, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 text-sm animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${idx * 0.8}s`, animationFillMode: 'both' }}
                  >
                    <Loader2 size={14} className="text-fuchsia-400 animate-spin" />
                    <span className="text-zinc-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && extractedData && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Успешно извличане</h3>
                  <p className="text-xs text-emerald-400 font-medium">Данни от OCR API</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Доставчик</div>
                  <div className="font-medium text-white">{extractedData.supplierName}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">ЕИК</div>
                  <div className="font-medium text-white">{extractedData.supplierEik || '—'}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Фактура №</div>
                  <div className="font-medium text-fuchsia-400">{extractedData.invoiceNumber}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs mb-1">Срок за плащане</div>
                  <div className="font-medium text-white">{extractedData.dueDate}</div>
                </div>
                <div className="col-span-2 pt-3 border-t border-white/10 flex justify-between items-center mt-2">
                  <span className="text-zinc-400">Обща сума за плащане:</span>
                  <span className="text-xl font-bold text-emerald-400">{extractedData.totalAmount} EUR</span>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-3">
                <BrainCircuit size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-xs text-indigo-200">
                  <span className="font-semibold text-indigo-300">AI Предложение: </span>
                  Прегледайте извлечените данни преди запис. Можете да коригирате полетата в следваща стъпка.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 pt-4">
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={() => setOpen(false)}
            disabled={scanning}
          >
            Отказ
          </Button>
          {step === 2 && (
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50"
            >
              Потвърди и Запиши
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
