'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function AccountingActionButtons({ lang }: { lang: string }) {
  const handleAICall = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: 'AI Асистентът анализира неконтираните документи...',
        success: 'Анализът е завършен. Всички документи са прегледани.',
        error: 'Възникна грешка при анализа.'
      }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={handleAICall}>
        <Zap size={16} className="text-indigo-500" /> Извикай AI Асистент
      </Button>
      <Link href={`/${lang}/dashboard/accounting/journal/new`}>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={16} /> Нов запис
        </Button>
      </Link>
    </div>
  );
}
