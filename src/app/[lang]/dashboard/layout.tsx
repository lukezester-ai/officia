// @ts-nocheck
import { Sidebar, MobileDashboardSidebar } from '@/components/dashboard/sidebar';
import { getDictionary } from '@/lib/get-dictionary';
import { UserButton } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import AiAssistant from '@/components/ai/AiAssistant';
import { defaultLocale, isLocale } from '@/lib/i18n';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang = isLocale(rawLang) ? rawLang : defaultLocale;
  const dict = await getDictionary(lang);

  return (
    <div className="relative min-h-screen bg-background" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar dict={dict.sidebar} lang={lang} />
      <div className="flex min-h-screen w-full flex-col md:ps-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/5 bg-background/50 px-4 backdrop-blur-md sm:px-6">
          <div className="flex max-w-sm flex-1 items-center gap-2 sm:gap-3">
            <MobileDashboardSidebar dict={dict.sidebar} lang={lang} />
            <div className="relative w-full">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder={dict.sidebar.search}
                className="h-9 w-full rounded-lg border border-white/10 bg-white/5 ps-9 pe-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted">
              <Bell size={16} className="text-muted-foreground" />
              <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="h-5 w-px bg-border" />
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
      <AiAssistant />
    </div>
  );
}
