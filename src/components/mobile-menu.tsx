'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function MobileMenu({ lang }: { lang: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const authRedirect = encodeURIComponent(`/${lang}/dashboard`);
  const signInHref = `/sign-in?redirect_url=${authRedirect}`;
  const signUpHref = `/sign-up?redirect_url=${authRedirect}`;

  return (
    <div className="md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        aria-label="Отвори меню"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-zinc-950/98 backdrop-blur-2xl border-b border-white/10 py-6 px-6 flex flex-col gap-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <a href="#features" onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-white transition-colors py-2 text-base font-medium">Функции</a>
          <a href="#pricing" onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-white transition-colors py-2 text-base font-medium">Цени</a>
          <a href="#social-proof" onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-white transition-colors py-2 text-base font-medium">Възможности</a>
          <div className="h-px bg-white/10 my-1" />
          <Link href={signInHref} onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-white transition-colors py-2 text-base font-medium">Вход</Link>
          <Link href={signUpHref} onClick={() => setIsOpen(false)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all px-4 py-3 rounded-xl font-semibold text-center text-base mt-2 shadow-lg shadow-violet-600/30">
            Започни безплатно
          </Link>
        </div>
      )}
    </div>
  );
}
