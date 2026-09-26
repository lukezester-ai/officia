'use client';

import { Printer } from 'lucide-react';

export function PrintButton({
  label = 'PDF / Печат',
  className = 'flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors px-4 py-2 rounded-xl text-sm font-medium print:hidden',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <Printer size={14} /> {label}
    </button>
  );
}
