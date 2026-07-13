'use client';
// @ts-nocheck

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { postPayrollToJournal } from './actions';

export function PayrollActionButtons({ payrollList }: { payrollList: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleExportCSV = () => {
    if (!payrollList || payrollList.length === 0) {
      toast.error('Няма данни във ведомостта за експорт.');
      return;
    }

    const headers = ['Име', 'Фамилия', 'Длъжност', 'Бруто (EUR)', 'ДОО', 'ДЗПО', 'ЗО', 'ДОД', 'Нето (EUR)'];
    const rows = payrollList.map(emp => [
      emp.firstName || '',
      emp.lastName || '',
      emp.position || '',
      emp.gross?.toFixed(2) || '0.00',
      emp.doo?.toFixed(2) || '0.00',
      emp.dzpo?.toFixed(2) || '0.00',
      emp.zzo?.toFixed(2) || '0.00',
      emp.tax?.toFixed(2) || '0.00',
      emp.net?.toFixed(2) || '0.00'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vedomost_TRZ_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV ведомостта е изтеглена успешно!');
  };

  const handlePostToJournal = async () => {
    if (!confirm('Потвърждавате ли начисляването на работните заплати и създаването на счетоводен запис?')) return;
    setLoading(true);
    const res = await postPayrollToJournal();
    if (res.success) {
      toast.success(`ТРЗ ведомостта е осчетоводявана! Запис №: ${res.journalNumber}`);
    } else {
      toast.error('Грешка: ' + (res.error || 'Неизвестна грешка'));
    }
    setLoading(false);
  };

  return (
    <div className="flex gap-3">
      <Button 
        variant="outline" 
        onClick={handleExportCSV}
        className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
      >
        <Download size={16} /> Експорт CSV
      </Button>
      <Button 
        onClick={handlePostToJournal}
        disabled={loading}
        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50"
      >
        <CheckCircle size={16} /> {loading ? 'Осчетоводяване...' : 'Потвърди и Осчетоводи'}
      </Button>
    </div>
  );
}
