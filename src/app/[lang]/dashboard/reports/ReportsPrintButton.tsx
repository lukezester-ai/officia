'use client';
// @ts-nocheck

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function ReportsPrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button 
      onClick={handlePrint}
      className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      <Download size={16} /> Експорт (PDF)
    </Button>
  );
}
