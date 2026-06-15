import { Sidebar } from '@/components/dashboard/sidebar';
import { getDictionary, Locale } from '@/lib/get-dictionary';
import { LanguageSwitcher } from '@/components/language-switcher';

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
    <div className="min-h-screen bg-slate-50">
      <Sidebar dict={dict.sidebar} lang={lang} />
      <div className="pl-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-white border-b flex items-center justify-end px-6 sticky top-0 z-10 gap-4">
          <LanguageSwitcher currentLang={lang} />
          <div className="h-8 w-8 rounded-full bg-slate-200 border flex items-center justify-center text-sm font-medium text-slate-500">U</div>
        </header>
        <main className="flex-1 p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
