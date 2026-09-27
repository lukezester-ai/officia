import Link from 'next/link';
import { AlertCircle, ArrowRight, Clock, FileText, Inbox, Landmark, ShoppingCart, TrendingUp, Wallet } from '@/components/icons';
import { getDashboardData } from './actions';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayLabel() {
  return new Intl.DateTimeFormat('bg-BG', {
    timeZone: 'Europe/Sofia',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export default async function DashboardPage({ params }: { params?: Promise<{ lang: string }> }) {
  const { lang = 'bg' } = (await params) || {};
  let loadError: string | null = null;
  const data = await Promise.race([
    getDashboardData(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 12_000);
    }),
  ]).catch((error: unknown) => {
    console.error('[dashboard]', error);
    loadError = error instanceof Error ? error.message : 'unknown';
    return null;
  });

  const revenue = data?.overviewStats?.revenue ?? 0;
  const expenses = data?.overviewStats?.expenses ?? 0;
  const outstandingCount = data?.overviewStats?.outstandingCount ?? 0;
  const outstandingAmount = data?.overviewStats?.outstandingAmount ?? 0;
  const difference = revenue - expenses;
  const overdueCount = data?.upcomingDeadlines?.overdueCount ?? 0;
  const overdueAmount = data?.upcomingDeadlines?.overdueAmount ?? 0;
  const dueSoonCount = data?.upcomingDeadlines?.dueSoonCount ?? 0;
  const dueSoonAmount = data?.upcomingDeadlines?.dueSoonAmount ?? 0;
  const bankReview = data?.needsReview?.transactions ?? 0;
  const docsReview = data?.needsReview?.documents ?? 0;
  const vatIssues = data?.needsReview?.vatIssues ?? 0;
  const inboxOpen = data?.overviewStats?.inboxOpenItems ?? 0;

  const lead = overdueCount > 0
    ? `${overdueCount} просрочени фактури за ${fmt(overdueAmount)} €. Това е първата работа за днес.`
    : dueSoonCount > 0
      ? `${dueSoonCount} издадени фактури с падеж до 7 дни, общо ${fmt(dueSoonAmount)} €.`
      : 'Няма просрочени фактури и няма падеж в следващите 7 дни.';

  const work = [
    { href: `/${lang}/dashboard/invoices`, label: 'Просрочени продажби', detail: overdueCount > 0 ? `${fmt(overdueAmount)} €` : 'Няма', count: overdueCount, icon: AlertCircle },
    { href: `/${lang}/dashboard/invoices`, label: 'Падеж до 7 дни', detail: dueSoonCount > 0 ? `${fmt(dueSoonAmount)} €` : 'Няма', count: dueSoonCount, icon: Clock },
    { href: `/${lang}/dashboard/banking`, label: 'Банкови редове за преглед', detail: 'От качено CSV', count: bankReview, icon: Landmark },
    { href: `/${lang}/dashboard/documents`, label: 'Документи за преглед', detail: 'След разпознаване', count: docsReview, icon: FileText },
    { href: `/${lang}/dashboard/vat`, label: 'ДДС грешки по фактури', detail: 'Статус на е-фактура', count: vatIssues, icon: AlertCircle },
    { href: `/${lang}/dashboard/ai-inbox`, label: 'Отворени входящи записи', detail: 'Не са AI съвет', count: inboxOpen, icon: Inbox },
  ];

  const jumps = [
    { href: `/${lang}/dashboard/invoices`, label: 'Фактури', text: 'Издаване и плащане' },
    { href: `/${lang}/dashboard/accounting`, label: 'Журнал', text: 'Записи, не автоматично осчетоводяване' },
    { href: `/${lang}/dashboard/banking`, label: 'Банка', text: 'Движения от CSV' },
    { href: `/${lang}/dashboard/reports`, label: 'Отчети', text: 'Суми от фактурите' },
  ];

  const metrics = [
    { label: 'Продажби', value: fmt(revenue), note: 'Издадени и платени', icon: TrendingUp },
    { label: 'Покупки', value: fmt(expenses), note: 'Одобрени и платени', icon: ShoppingCart },
    { label: 'Разлика', value: fmt(difference), note: 'От фактури, не от баланса', icon: Wallet },
    { label: 'За събиране', value: fmt(outstandingAmount), note: `${outstandingCount} издадени`, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Фирмените данни още се зареждат от базата. Презареди страницата; нулите по-долу не означават, че фирмата е празна.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c14] px-6 py-7 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Officia</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Днес, {todayLabel()}</h1>
        <p className="mt-3 max-w-2xl text-base text-zinc-300">{lead}</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <item.icon size={18} className="text-[#a78bfa]" />
              <span className="text-xs text-zinc-500">{item.label}</span>
            </div>
            <div className="text-3xl font-bold tabular-nums tracking-tight text-white">{item.value}</div>
            <p className="mt-1 text-sm text-zinc-500">€ · {item.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-3">
          <h2 className="text-base font-semibold text-white">Работата за днес</h2>
          <div className="mt-4 divide-y divide-white/8">
            {work.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex cursor-pointer items-center gap-3 py-3 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-violet-500/60"
              >
                <item.icon size={16} className="shrink-0 text-zinc-500 group-hover:text-[#a78bfa]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-200">{item.label}</span>
                  <span className="block text-xs text-zinc-500">{item.detail}</span>
                </span>
                <span className="tabular-nums text-sm font-semibold text-white">{item.count}</span>
                <ArrowRight size={14} className="text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#a78bfa]" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-white">Къде се върши</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {jumps.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="cursor-pointer rounded-xl border border-white/8 px-4 py-3 outline-none transition-colors hover:border-[#7c3aed]/50 hover:bg-[#7c3aed]/10 focus-visible:ring-2 focus-visible:ring-violet-500/60"
              >
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{item.text}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
