'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Landmark } from 'lucide-react';
import { NraSubmitModal } from './NraSubmitModal';

export function VatActions() {
  const [isNraModalOpen, setIsNraModalOpen] = useState(false);

  return (
    <div className="flex gap-3">
      <Button variant="outline" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 dark:text-slate-300">
        <Download size={16} /> Експорт (TXT)
      </Button>
      <Button 
        onClick={() => setIsNraModalOpen(true)}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50"
      >
        <Landmark size={16} /> Подай към НАП
      </Button>

      <NraSubmitModal 
        isOpen={isNraModalOpen} 
        onClose={() => setIsNraModalOpen(false)} 
        onSuccess={() => {}}
      />
    </div>
  );
}
