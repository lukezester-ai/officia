import { Sidebar } from '@/components/dashboard/sidebar';
import { getDictionary, Locale } from '@/lib/get-dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';
import { UserButton } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import { AiWidget } from '@/components/ai/ai-widget';

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
    <div className="min-h-screen bg-muted/40 relative">
      <Sidebar dict={dict.sidebar} lang={lang} />
      <div className="pl-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-background border-b flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Търси..."
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground transition"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLang={lang} />
            <button className="relative h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <Bell size={17} className="text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="w-px h-5 bg-border" />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
      <AiWidget />
    </div>
  );
}