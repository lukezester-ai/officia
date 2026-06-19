"use client";

import React, { useState } from 'react';
import { Upload, FileText, BrainCircuit, Check, Clock } from 'lucide-react';
import { uploadAndAnalyzeDocument } from './actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function DocumentsClient({ initialDocuments }: { initialDocuments: any[] }) {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    
    // В реално приложение тук ще се чете текста от PDF-а.
    // За MVP-то симулираме четене.
    const rawText = "Договор за наем. Срок за плащане на наем: 5-то число.";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rawText', rawText);

    toast.promise(uploadAndAnalyzeDocument(formData), {
      loading: 'AI анализира документа...',
      success: (data) => {
        if (data.success) {
          router.push('/bg/dashboard/tasks');
          return 'Документът е анализиран! Вижте предложените задачи.';
        }
        throw new Error(data.error);
      },
      error: 'Грешка при анализ'
    });

    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
        <input 
          type="file" 
          onChange={handleUpload} 
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          accept=".pdf,.doc,.docx,.txt"
        />
        <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="p-4 bg-purple-500/20 text-purple-400 rounded-full">
            {isUploading ? <BrainCircuit className="animate-pulse" size={32} /> : <Upload size={32} />}
          </div>
          <div>
            <div className="font-bold text-lg mb-1">Кликнете или плъзнете документ тук</div>
            <div className="text-sm text-zinc-400">AI автоматично ще извлече срокове и задачи от него</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialDocuments.map(doc => (
          <div key={doc.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <FileText size={24} className="text-zinc-300" />
              </div>
              <div>
                <div className="font-semibold line-clamp-1">{doc.title}</div>
                <div className="flex items-center gap-2 mt-2">
                  {doc.status === 'analyzed' ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                      <Check size={12} /> Анализиран
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                      <Clock size={12} /> Чака анализ
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {initialDocuments.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-12">
            Няма качени документи
          </div>
        )}
      </div>
    </div>
  );
}
