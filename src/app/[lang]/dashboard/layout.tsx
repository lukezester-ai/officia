// @ts-nocheck
import { Sidebar } from '@/components/dashboard/sidebar';
import { getDictionary, Locale } from '@/lib/get-dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';
import { UserButton } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import AiAssistant from '@/components/ai/AiAssistant';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar dict={dict.sidebar} lang={lang} />
      <div className="pl-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-background/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Търси..."
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 text-white placeholder:text-zinc-500 transition"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLang={lang} />
            <button className="relative h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <Bell size={16} className="text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="w-px h-5 bg-border" />
            <UserButton />
          </div>
        </header>
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
      <AiAssistant />
    </div>
  );
}