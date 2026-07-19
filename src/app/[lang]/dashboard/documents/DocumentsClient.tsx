'use client';
// @ts-nocheck

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, FileSignature, CheckCircle, Clock, Upload, X, Loader2, Sparkles, Eye } from 'lucide-react';
import { DocumentDrawer } from '@/components/drawers/document-drawer';
import { uploadAndAnalyzeDocument } from './actions';
import { toast } from 'sonner';

// ── OCR + Upload flow ────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface OcrResult {
  totalAmount?: number;
  currency?: string;
  invoiceNumber?: string;
  date?: string;
  counterpartyName?: string;
  extractedText?: string;
}

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [stage, setStage]         = useState<'idle' | 'ocr' | 'saving' | 'done'>('idle');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  function pickFile(f: File) {
    setFile(f);
    setOcrResult(null);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  async function runOcr() {
    if (!file) return;
    setStage('ocr');
    let data: any = null;
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'application/octet-stream';
      // OCR only here — full cross-agent pipeline runs after document is saved
      const res = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType, runPipeline: false }),
      });
      if (!res.ok) throw new Error(`OCR грешка: ${res.status}`);
      data = await res.json();
      setOcrResult(data);
      toast.success('OCR анализът завърши успешно!');
    } catch (e: any) {
      toast.error(e?.message ?? 'OCR грешка');
      setStage('idle');
      return;
    }

    // Auto-save + start document_lifecycle pipeline across agents
    setStage('saving');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('rawText', data?.extractedText ?? '');
      fd.append('ocrJson', JSON.stringify(data ?? {}));
      const saveRes = await uploadAndAnalyzeDocument(fd);
      if (saveRes.success) {
        const pipe = (saveRes as any).pipeline;
        if (pipe?.success) {
          toast.success('Документът е запазен. AI pipeline създаде чернова и заявка за контировка.');
        } else {
          toast.success('Документът е запазен и изпратен за AI анализ!');
        }
        setStage('done');
        setFile(null);
        setPreview(null);
        setOcrResult(null);
        onUploaded();
      } else {
        throw new Error(saveRes.error);
      }
    } catch (e: any) {
      toast.error('Грешка при запазване: ' + e?.message);
      setStage('idle');
    }
  }

  async function saveAfterOcr() {
    if (!file) return;
    setStage('saving');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('rawText', ocrResult?.extractedText ?? '');
      if (ocrResult) fd.append('ocrJson', JSON.stringify(ocrResult));
      const saveRes = await uploadAndAnalyzeDocument(fd);
      if (saveRes.success) {
        toast.success(
          (saveRes as any).pipeline?.success
            ? 'Запазено + AI pipeline между агентите е стартиран.'
            : 'Документът е запазен!',
        );
        setStage('done');
        setFile(null); setPreview(null); setOcrResult(null);
        onUploaded();
      } else throw new Error(saveRes.error);
    } catch (e: any) {
      toast.error('Грешка: ' + e?.message);
      setStage('idle');
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 text-center
            ${dragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-white/15 bg-white/3 hover:border-indigo-400/50 hover:bg-indigo-500/5'}`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/20">
              <Upload size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Пусни файл тук или кликни за качване</p>
              <p className="text-sm text-zinc-500 mt-1">Поддържа: PNG, JPG, PDF · AI OCR автоматично</p>
            </div>
            <div className="flex gap-2 mt-1">
              {['📄 Фактура', '📑 Договор', '🧾 Касова бележка', '📋 Друг'].map(t => (
                <span key={t} className="text-xs bg-white/5 border border-white/10 text-zinc-400 rounded-full px-2.5 py-1">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File selected */}
      {file && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/20">
                <FileText size={24} className="text-indigo-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-200 truncate">{file.name}</p>
              <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown'}</p>
            </div>
            {stage === 'idle' && (
              <button onClick={() => { setFile(null); setPreview(null); setOcrResult(null); }} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          {/* OCR Result */}
          {ocrResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2"><Sparkles size={14} /> AI OCR Резултат</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {ocrResult.counterpartyName && (
                  <div><span className="text-zinc-500 text-xs">Контрагент:</span><br /><span className="text-zinc-200">{ocrResult.counterpartyName}</span></div>
                )}
                {ocrResult.invoiceNumber && (
                  <div><span className="text-zinc-500 text-xs">Номер:</span><br /><span className="text-zinc-200">{ocrResult.invoiceNumber}</span></div>
                )}
                {ocrResult.totalAmount && (
                  <div><span className="text-zinc-500 text-xs">Сума:</span><br /><span className="text-emerald-400 font-semibold">{ocrResult.totalAmount} {ocrResult.currency || 'лв.'}</span></div>
                )}
                {ocrResult.date && (
                  <div><span className="text-zinc-500 text-xs">Дата:</span><br /><span className="text-zinc-200">{ocrResult.date}</span></div>
                )}
              </div>
              {ocrResult.extractedText && (
                <details className="text-xs text-zinc-500 mt-1">
                  <summary className="cursor-pointer hover:text-zinc-300 flex items-center gap-1"><Eye size={11} /> Извлечен текст</summary>
                  <p className="mt-1 p-2 bg-white/5 rounded-lg whitespace-pre-wrap line-clamp-4">{ocrResult.extractedText}</p>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {stage === 'idle' && !ocrResult && (
              <Button onClick={runOcr} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
                <Sparkles size={15} /> OCR анализ + запази
              </Button>
            )}
            {stage === 'idle' && ocrResult && (
              <Button onClick={saveAfterOcr} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                <CheckCircle size={15} /> Запази документа
              </Button>
            )}
            {(stage === 'ocr' || stage === 'saving') && (
              <Button disabled className="gap-2 flex-1 opacity-70">
                <Loader2 size={15} className="animate-spin" />
                {stage === 'ocr' ? 'AI анализира...' : 'Запазване...'}
              </Button>
            )}
            {stage === 'idle' && (
              <Button variant="outline" onClick={() => inputRef.current?.click()} className="border-white/10 text-zinc-400 gap-1.5">
                <Upload size={14} /> Смени
              </Button>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Document list ─────────────────────────────────────────────────────────────

export default function DocumentsClient({ initialDocuments }: { initialDocuments: any[] }) {
  const [docs, setDocs]           = useState<any[]>(initialDocuments);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [showUpload, setShowUpload]   = useState(false);

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'contract': return <FileSignature size={16} className="text-emerald-400" />;
      case 'invoice':  return <FileText size={16} className="text-indigo-400" />;
      default:         return <FileText size={16} className="text-zinc-400" />;
    }
  };
  const getDocTypeLabel = (type: string) => {
    const map: Record<string, string> = { contract: 'Договор', invoice: 'Фактура', order: 'Заповед', receipt: 'Касова бележка' };
    return map[type] ?? 'Друг';
  };

  async function handleUploaded() {
    // Reload via page refresh (server component revalidates)
    window.location.reload();
  }

  return (
    <>
      {/* Upload toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{docs.length} {docs.length === 1 ? 'документ' : 'документа'} в архива</p>
        <Button
          onClick={() => setShowUpload(v => !v)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Upload size={15} /> {showUpload ? 'Скрий' : 'Качи документ'}
        </Button>
      </div>

      {/* Upload zone */}
      {showUpload && <UploadZone onUploaded={handleUploaded} />}

      {/* Document list */}
      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="pl-6 text-zinc-400">Файл</TableHead>
                <TableHead className="text-zinc-400">Тип</TableHead>
                <TableHead className="text-zinc-400">Контрагент</TableHead>
                <TableHead className="text-zinc-400">Дата</TableHead>
                <TableHead className="text-zinc-400">AI Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-zinc-500">
                    <FileText size={36} className="mx-auto mb-3 opacity-30" />
                    <p>Няма качени документи. Качете първия файл горе.</p>
                  </TableCell>
                </TableRow>
              ) : docs.map(doc => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer hover:bg-white/5 border-white/10 transition-colors group"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <TableCell className="pl-6 font-medium">
                    <div className="flex items-center gap-3">
                      {getDocIcon(doc.type)}
                      <span className="truncate max-w-[250px] text-zinc-200">{doc.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-300">{getDocTypeLabel(doc.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400">{doc.metadata?.counterpartyName || '—'}</TableCell>
                  <TableCell className="text-zinc-400">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('bg-BG') : '—'}
                  </TableCell>
                  <TableCell>
                    {doc.status === 'analyzed' ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span className="text-emerald-400">Анализиран</span>
                        {doc.aiStatus === 'needs_review' && (
                          <Badge variant="outline" className="ml-1 border-amber-500/30 text-amber-400 bg-amber-500/10">Преглед</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                        <Clock size={14} /> Обработва се...
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DocumentDrawer
        document={selectedDoc}
        open={!!selectedDoc}
        onOpenChange={o => !o && setSelectedDoc(null)}
      />
    </>
  );
}
