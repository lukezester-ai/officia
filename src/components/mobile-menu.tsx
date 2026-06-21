'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function MobileMenu({ lang }: { lang: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-zinc-400 hover:text-white transition-colors"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-zinc-950/95 backdrop-blur-xl border-b border-white/10 py-4 px-6 flex flex-col gap-4 shadow-xl z-50">
          <a href="#features" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 text-lg font-medium">Функции</a>
          <a href="#pricing" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 text-lg font-medium">Цени</a>
          <div className="h-px bg-white/10 my-2" />
          <Link href="/sign-in" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 text-lg font-medium">Вход</Link>
          <Link href="/sign-up" onClick={() => setIsOpen(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white transition-colors px-4 py-3 rounded-xl font-medium text-center text-lg mt-2">
            Започни безплатно
          </Link>
        </div>
      )}
    </div>
  );
}
