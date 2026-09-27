import { headers } from 'next/headers';
import { Sidebar, MobileDashboardSidebar } from '@/components/dashboard/sidebar';
import { getDictionary, Locale } from '@/lib/get-dictionary';
import { UserButton } from '@clerk/nextjs';
import { Bell, Search } from '@/components/icons';
import AiAssistant from '@/components/ai/AiAssistant';
import { getEntitlement } from '@/lib/billing/entitlements';
import { TrialEnded } from '@/components/billing/PlanLocked';

// Dashboard pages read authenticated, tenant-scoped database state and must
// never be executed while generating static build output.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const path = (await headers()).get('x-officia-path') || '';
  let access: Awaited<ReturnType<typeof getEntitlement>> | null = null;
  try {
    access = await getEntitlement();
  } catch {
    access = null;
  }
  const hiddenHrefs = [
    access && !access.modules.hr ? `/${lang}/dashboard/hr` : '',
    access && !access.modules.payroll ? `/${lang}/dashboard/payroll` : '',
    access && !access.modules.ai ? `/${lang}/dashboard/ai-assistant` : '',
  ].filter(Boolean);
  const trialClosed = Boolean(access && !access.active && !path.includes('/dashboard/settings'));

  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar dict={dict.sidebar} lang={lang} hiddenHrefs={hiddenHrefs} />
      <div className="md:pl-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-background/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-sm">
            <MobileDashboardSidebar dict={dict.sidebar} lang={lang} hiddenHrefs={hiddenHrefs} />
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
            <button className="relative h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <Bell size={16} className="text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="w-px h-5 bg-border" />
            <UserButton />
          </div>
        </header>
        {access?.plan === 'starter' && access.active && access.daysLeft != null && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            Остават {access.daysLeft} дни безплатен достъп. След това екраните спират, докато не се плати план. Фактури този месец: {access.usage.invoicesThisMonth}/{access.limits.invoicesPerMonth}.
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          {trialClosed ? <TrialEnded /> : children}
        </main>
      </div>
      {access?.modules.ai && access.active ? <AiAssistant /> : null}
    </div>
  );
}
