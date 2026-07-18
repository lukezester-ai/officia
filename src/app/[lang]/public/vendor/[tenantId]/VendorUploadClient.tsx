'use client';

import { useState, useRef } from 'react';
import { submitVendorDocument } from './actions';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';

export default function VendorUploadClient({ tenantId, tenantName }: { tenantId: string, tenantName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const res = await submitVendorDocument(tenantId, file.name, file.type);
    
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Възникна грешка при качването.');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-emerald-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Успешно качено!</h2>
        <p className="text-slate-500 mb-8">
          Фактурата беше изпратена сигурно към системата на <strong>{tenantName}</strong>. 
          Ако имат въпроси, ще се свържат с вас.
        </p>
        <button 
          onClick={() => { setSuccess(false); setFile(null); }}
          className="text-violet-600 font-medium hover:text-violet-700"
        >
          Качи друг документ
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="text-violet-600 w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Изпращане на фактура към</h2>
        <p className="text-violet-600 font-bold text-lg mt-1">{tenantName}</p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {!file ? (
        <div 
          className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="application/pdf,image/*" 
          />
          <p className="text-slate-500 font-medium">Кликнете или плъзнете файл тук</p>
          <p className="text-slate-400 text-xs mt-2">PDF, PNG или JPG</p>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
            <FileText className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-medium truncate">{file.name}</p>
            <p className="text-slate-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button 
            onClick={() => setFile(null)}
            className="text-slate-400 hover:text-rose-500 font-medium text-sm px-2"
          >
            Премахни
          </button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-6"
      >
        {loading && <Loader2 className="animate-spin" size={18} />}
        {loading ? 'Изпращане...' : 'Изпрати към счетоводството'}
      </button>
    </div>
  );
}
