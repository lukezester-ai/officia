'use client';

import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export function PrintButton() {
  
  useEffect(() => {
    // Optionally trigger print automatically after a short delay
    // setTimeout(() => window.print(), 500);
  }, []);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => window.close()} 
        className="bg-white text-zinc-700 hover:bg-zinc-100 shadow-sm border-zinc-200"
      >
        <ArrowLeft className="mr-2" size={16} />
        Затвори
      </Button>
      <Button 
        onClick={() => window.print()} 
        className="bg-violet-600 hover:bg-violet-700 text-white shadow-md border border-violet-500"
      >
        <Printer className="mr-2" size={16} />
        Принтирай / Запази като PDF
      </Button>
    </>
  );
}
