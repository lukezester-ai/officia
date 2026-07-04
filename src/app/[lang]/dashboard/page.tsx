import { Suspense } from 'react';
import DashboardContent from './DashboardContent';
import { getDictionary, Locale } from '@/lib/get-dictionary';

export default async function DashboardPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);
  const t = dict.dashboard;
  const now = new Date();
  const dateLocale = lang === 'en' ? 'en-GB' : 'bg-BG';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.operationalCenter}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.operationalSubtitle}</p>
        </div>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg font-medium">
          {now.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent lang={lang} dict={dict} />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl p-5 bg-white/5 border border-white/10 animate-pulse">
            <div className="h-4 w-20 bg-white/10 rounded mb-4" />
            <div className="h-8 w-32 bg-white/10 rounded mb-1" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl p-5 bg-white/5 border border-white/10 animate-pulse h-48" />
        ))}
      </div>
    </>
  );
}
