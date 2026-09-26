'use client';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, FileKey, Zap, LayoutList, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getCounterparties } from '@/app/[lang]/dashboard/counterparties/actions';
import { linkDocumentToClient } from '@/app/[lang]/dashboard/documents/actions';

function LinkClient({ documentId, linkedName, onLinked }: { documentId: string; linkedName?: string | null; onLinked: (name: string) => void }) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getCounterparties().then((res) => {
      if (res.success) {
        setClients((res.data || []).filter((row) => row.isActive !== false).map((row) => ({ id: row.id, name: row.name })));
      }
    });
  }, []);

  async function link() {
    setSaving(true);
    const res = await linkDocumentToClient(documentId, clientId);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Документът не беше свързан.');
      return;
    }
    toast.success(`Свързан с ${res.counterpartyName}.`);
    onLinked(res.counterpartyName);
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-xs text-muted-foreground">{linkedName ? `Свързан с ${linkedName}` : 'Още не е свързан с клиент.'}</p>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Избери клиент</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </select>
      <Button variant="outline" className="w-full justify-start gap-2" onClick={link} disabled={saving || !clientId}>
        <CheckCircle size={16} className="text-emerald-500" />
        {saving ? 'Запис...' : 'Свържи с клиент'}
      </Button>
    </div>
  );
}

export function DocumentDrawer({ document, open, onOpenChange, onLinked }: { document: any, open: boolean, onOpenChange: (open: boolean) => void, onLinked?: (name: string) => void }) {
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
              {document.aiSummary || (document.status === 'analyzed'
                ? 'Анализът е готов.'
                : 'Файлът е в архива. Анализът не е пуснат.')}
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
              <LinkClient documentId={document.id} linkedName={document.counterpartyName} onLinked={(name) => onLinked?.(name)} />
              <Button variant="outline" className="justify-start gap-2">
                <Clock size={16} />
                Създай задача
              </Button>
              {document.fileUrl ? (
                <a href={`/api/documents/${document.id}`} className="inline-flex items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                  <Download size={16} />
                  Изтегли файл
                </a>
              ) : (
                <Button variant="outline" className="justify-start gap-2" onClick={() => toast.info('Към този запис няма файл.')}>
                  <Download size={16} />
                  Изтегли файл
                </Button>
              )}
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
