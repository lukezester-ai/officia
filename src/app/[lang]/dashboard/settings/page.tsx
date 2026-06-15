'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, HardDrive, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);

  const handleRunCleanup = async () => {
    setIsCleaning(true);
    toast.info('Стартиране на AI Cleaner агента...', { duration: 3000 });

    try {
      const response = await fetch('/api/ai/clean', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Грешка при почистване');
      }

      setLastReport(data);
      toast.success('Почистването завърши успешно!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0F1F3D] dark:text-white">Настройки на системата</h1>
        <p className="text-gray-500 mt-1">Управление на данни, достъп и автоматизация.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-200 dark:border-slate-800 shadow-sm border-l-4 border-l-[#4F46E5] dark:border-l-[#4F46E5]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="text-[#4F46E5]" size={20} /> Защита на данните (GDPR)
            </CardTitle>
            <CardDescription>Политика за съхранение на чувствителни данни</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-gray-600">Счетоводни документи:</span>
              <span className="font-medium">Пазят се 5 години</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Архив служители:</span>
              <span className="font-medium">Пазят се 3 години</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="text-gray-700" size={20} /> Пространство (Storage)
            </CardTitle>
            <CardDescription>Използвано AWS S3 пространство</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-2">
              <span className="text-3xl font-bold text-[#0F1F3D] dark:text-white">42.5 GB</span>
              <span className="text-sm text-gray-500 mb-1">от 100 GB</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
              <div className="bg-[#4F46E5] h-2 rounded-full" style={{ width: '42.5%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-rose-100 dark:border-rose-900 shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Trash2 size={120} />
        </div>
        <CardHeader className="border-b border-gray-50 dark:border-slate-800/50 pb-4 relative z-10">
          <CardTitle className="text-rose-600 flex items-center gap-2">
            <Trash2 size={20} /> AI Cleaner Agent (Хигиенист)
          </CardTitle>
          <CardDescription>
            Този агент се стартира автоматично всяка неделя в 03:00 ч. Той намира и изтрива файлове без свързана фактура, както и стари GDPR записи.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-gray-500 flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-md w-fit">
              <Clock size={16} /> Последно пускане: Преди 5 дни
            </div>
            <Button 
              onClick={handleRunCleanup} 
              disabled={isCleaning} 
              variant="outline" 
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 w-full sm:w-auto transition-all"
            >
              {isCleaning ? 'Сканиране на базата...' : 'Стартирай принудително почистване'}
            </Button>
          </div>

          {lastReport && (
            <div className="mt-6 p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-4">
              <h4 className="flex items-center gap-2 font-semibold text-emerald-800 mb-3 pb-2 border-b border-emerald-200/50">
                <CheckCircle2 size={18} /> Одиторски доклад от AI
              </h4>
              <p className="text-emerald-700 text-sm leading-relaxed">
                {lastReport.auditReport}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-400 font-medium shadow-sm">
                  Изтрити документи: {lastReport.stats.orphanedDocumentsDeleted}
                </div>
                {lastReport.stats.gdprExpiredRecordsDeleted > 0 && (
                  <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-400 font-medium shadow-sm">
                    GDPR записи: {lastReport.stats.gdprExpiredRecordsDeleted}
                  </div>
                )}
                <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-400 font-medium shadow-sm">
                  Освободено: {lastReport.stats.storageFreedMB} MB
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
