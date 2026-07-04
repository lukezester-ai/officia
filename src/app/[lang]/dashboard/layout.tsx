import { Sidebar } from '@/components/dashboard/sidebar';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';

import { getDictionary, Locale } from '@/lib/get-dictionary';

import { SearchProvider } from '@/components/search/global-search';



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

    <SearchProvider labels={{ search: dict.search, header: dict.header }}>

      <div className="relative min-h-screen bg-background">

        <Sidebar dict={dict.sidebar} lang={lang} />

        <div className="flex min-h-screen w-full flex-col pl-64">

          <DashboardHeader lang={lang} labels={dict.header} />

          <main className="flex-1 overflow-x-hidden p-8">{children}</main>

        </div>

      </div>

    </SearchProvider>

  );

}

