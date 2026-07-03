'use client';

import Link from 'next/link';
import { Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccountingActionButtons({ lang }: { lang: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/${lang}/dashboard/ai-assistant`}>
        <Button variant="outline" className="gap-2">
          <Zap size={16} className="text-indigo-500" />
          Отвори AI асистента
        </Button>
      </Link>
      <Link href={`/${lang}/dashboard/accounting/journal/new`}>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={16} />
          Нов запис
        </Button>
      </Link>
    </div>
  );
}
