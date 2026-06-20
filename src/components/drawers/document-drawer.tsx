'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, FileKey, Zap, LayoutList, Download } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentDrawer({ document, open, onOpenChange }: { document: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  if (!document) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-l border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-500"/>
            <span className="truncate">{document.title}</span>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 pt-1">
            <Badge variant="outline">{document.type}</Badge>
            <span className="text-xs text-muted-foreground">
              Качен на {document.createdAt ? new Date(document.createdAt).toLocaleDateString('bg-BG') : '—'}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          
          {/* AI Panel */}
          <div className={`p-4 rounded-xl border ${document.aiStatus === 'needs_review' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30' : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30'}`}>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Zap size={16} className={document.aiStatus === 'needs_review' ? 'text-amber-500' : 'text-indigo-500'} /> 
              {document.aiStatus === 'needs_review' ? 'Нужен преглед от човек' : 'AI Анализ'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {document.aiSummary || 'Този документ е анализиран успешно. Открити са ключови полета.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Действия</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start gap-2" onClick={() => toast.info('Създаване на фактура...')}>
                <FileText size={16} className="text-indigo-500" />
                Създай фактура
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => toast.info('Свързване с контрагент...')}>
                <CheckCircle size={16} className="text-emerald-500" />
                Свържи с клиент
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Clock size={16} />
                Създай задача
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Download size={16} />
                Изтегли файл
              </Button>
            </div>
          </div>

          {/* Extracted Fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <FileKey size={14}/> Извлечени данни
            </h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4 space-y-3">
              {document.metadata ? (
                Object.entries(document.metadata).map(([key, value]) => (
                  <div key={key} className="flex flex-col text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                    <span className="text-muted-foreground text-xs uppercase">{key}</span>
                    <span className="font-medium mt-0.5">{String(value)}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">Няма извлечени данни.</div>
              )}
            </div>
          </div>

          {/* Raw Text Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <LayoutList size={14}/> Разпознат текст (OCR)
            </h3>
            <div className="bg-white dark:bg-slate-950 border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {document.contentExtracted || 'Липсва разпознат текст.'}
              </p>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
