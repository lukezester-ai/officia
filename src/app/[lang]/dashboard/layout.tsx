import { Suspense, type ReactNode } from 'react';
import { headers } from 'next/headers';
import { Sidebar, MobileDashboardSidebar } from '@/components/dashboard/sidebar';
import { getDictionary, Locale } from '@/lib/get-dictionary';
import { UserButton } from '@clerk/nextjs';
import { GlobalSearch, SearchTrigger } from '@/components/search/global-search';
import AiAssistant from '@/components/ai/AiAssistant';
import { getEntitlement } from '@/lib/billing/entitlements';
import { TrialEnded } from '@/components/billing/PlanLocked';

// Dashboard pages read authenticated, tenant-scoped database state and must
// never be executed while generating static build output.
export const dynamic = 'force-dynamic';

type Access = Awaited<ReturnType<typeof getEntitlement>> | null;
type SidebarDict = Awaited<ReturnType<typeof getDictionary>>['sidebar'];

function hiddenHrefsFor(lang: string, access: Access) {
  return [
    access && !access.modules.hr ? `/${lang}/dashboard/hr` : '',
    access && !access.modules.payroll ? `/${lang}/dashboard/payroll` : '',
    access && !access.modules.ai ? `/${lang}/dashboard/ai-assistant` : '',
  ].filter(Boolean);
}

async function readAccess(): Promise<Access> {
  try {
    return await getEntitlement();
  } catch {
    return null;
  }
}

async function GatedDesktopSidebar({ dict, lang }: { dict: SidebarDict; lang: string }) {
  const access = await readAccess();
  return <Sidebar dict={dict} lang={lang} hiddenHrefs={hiddenHrefsFor(lang, access)} />;
}

async function GatedMobileSidebar({ dict, lang }: { dict: SidebarDict; lang: string }) {
  const access = await readAccess();
  return <MobileDashboardSidebar dict={dict} lang={lang} hiddenHrefs={hiddenHrefsFor(lang, access)} />;
}

async function AdminBadge() {
  const access = await readAccess();
  if (!access?.admin) return null;
  return <span className="text-xs font-medium text-violet-300">Администратор</span>;
}

async function TrialBanner() {
  const access = await readAccess();
  if (!(access?.plan === 'starter' && access.active && access.daysLeft != null)) return null;
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
      Остават {access.daysLeft} дни безплатен достъп. След това екраните спират, докато не се плати план. Фактури този месец: {access.usage.invoicesThisMonth}/{access.limits.invoicesPerMonth}.
    </div>
  );
}

async function TrialLock({ path }: { path: string }) {
  const access = await readAccess();
  const trialClosed = Boolean(access && !access.active && !path.includes('/dashboard/settings'));
  if (!trialClosed) return null;
  return (
    <div className="absolute inset-0 z-20 bg-background p-4 sm:p-6 md:p-8">
      <TrialEnded />
    </div>
  );
}

async function MaybeAssistant() {
  const access = await readAccess();
  if (!(access?.modules.ai && access.active)) return null;
  return <AiAssistant />;
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const path = (await headers()).get('x-officia-path') || '';

  return (
    <div className="min-h-screen bg-background relative">
      <Suspense fallback={<Sidebar dict={dict.sidebar} lang={lang} hiddenHrefs={[]} />}>
        <GatedDesktopSidebar dict={dict.sidebar} lang={lang} />
      </Suspense>
      <div className="md:pl-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-background/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-sm">
            <Suspense fallback={<MobileDashboardSidebar dict={dict.sidebar} lang={lang} hiddenHrefs={[]} />}>
              <GatedMobileSidebar dict={dict.sidebar} lang={lang} />
            </Suspense>
            <SearchTrigger />
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <AdminBadge />
            </Suspense>
            <UserButton />
          </div>
        </header>
        <Suspense fallback={null}>
          <TrialBanner />
        </Suspense>
        <main className="relative flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          {children}
          <Suspense fallback={null}>
            <TrialLock path={path} />
          </Suspense>
        </main>
      </div>
      <GlobalSearch />
      <Suspense fallback={null}>
        <MaybeAssistant />
      </Suspense>
    </div>
  );
}
