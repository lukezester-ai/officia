import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, ShoppingCart, Wallet, AlertCircle, ArrowUpRight, BarChart3, Inbox, Clock, CheckSquare } from 'lucide-react';
import { getDashboardData } from './actions';
import Link from 'next/link';
import { MorningBriefing } from '@/components/dashboard/MorningBriefing';
import { getInvoices } from './invoices/actions';

const UNPAID_LIKE = ['issued', 'sent', 'pending', 'издадена', 'изпратена'];

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DashboardPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const data = await getDashboardData().catch(() => null);
  
  // We keep pulling raw invoice data just in case we need the lists for now
  const [invRes] = await Promise.all([
    getInvoices().catch(() => ({ success: false, data: [] })),
  ]);

  const invoices: any[] = invRes.success ? (invRes as any).data : [];

  const revenue = data?.overviewStats?.revenue ?? 0;
  const expenses = data?.overviewStats?.expenses ?? 0;
  const netProfit = data?.overviewStats?.netProfit ?? revenue - expenses;
  const periodLabel = data?.overviewStats?.periodLabel;

  const outstanding = invoices.filter(i => UNPAID_LIKE.includes(i.status));
  const outstandingAmount = outstanding.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Оперативен център</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Какво изисква вниманието ти днес</p>
        </div>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg font-medium">
          {now.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Proactive AI Briefing */}
      <MorningBriefing />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Приходи */}
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-violet-500/5 transition-all hover:border-violet-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-violet-500/20 text-violet-400 rounded-xl p-2.5">
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-medium bg-white/5 px-2.5 py-1 rounded-full text-zinc-400">Приходи</span>
          </div>
          <div className="text-3xl font-bold tracking-tight mb-1 text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{fmt(revenue)}</div>
          <div className="text-sm text-zinc-500">€ от продажби{periodLabel ? ` · ${periodLabel}` : ''}</div>
        </div>

        {/* Разходи */}
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-amber-500/5 transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-500/20 text-amber-400 rounded-xl p-2.5">
              <ShoppingCart size={18} />
            </div>
            <span className="text-xs font-medium bg-white/5 px-2.5 py-1 rounded-full text-zinc-400">Разходи</span>
          </div>
          <div className="text-3xl font-bold tracking-tight mb-1 text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{fmt(expenses)}</div>
          <div className="text-sm text-zinc-500">€ разходи за месеца</div>
        </div>

        {/* Резултат */}
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-emerald-500/5 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className={`rounded-xl p-2.5 ${netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <Wallet size={18} />
            </div>
            <span className="text-xs font-medium bg-white/5 px-2.5 py-1 rounded-full text-zinc-400">Резултат</span>
          </div>
          <div className="text-3xl font-bold tracking-tight mb-1 text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{fmt(netProfit)}</div>
          <div className="text-sm text-zinc-500">€ нетна печалба</div>
        </div>

        {/* Чакащи плащания */}
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg shadow-rose-500/5 transition-all hover:border-rose-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-rose-500/20 text-rose-400 rounded-xl p-2.5">
              <AlertCircle size={18} />
            </div>
            <span className="text-xs font-medium bg-white/5 px-2.5 py-1 rounded-full text-zinc-400">{outstanding.length} бр.</span>
          </div>
          <div className="text-3xl font-bold tracking-tight mb-1 text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{fmt(outstandingAmount)}</div>
          <div className="text-sm text-zinc-500">€ за събиране</div>
        </div>
      </div>

      {/* The 4 Operational Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Block 1: Needs Review */}
        <Card className="shadow-sm border-0 bg-white dark:bg-slate-900 border-l-4 border-l-rose-500">
          <CardHeader className="pb-3 border-b border-muted">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                <AlertCircle size={14} className="text-rose-600" />
              </div>
              Нуждаят се от преглед
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Фактури за преглед</span>
              <span className="font-semibold">{data?.needsReview?.invoices || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Банкови транзакции</span>
              <span className="font-semibold">{data?.needsReview?.transactions || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Документи без данни</span>
              <span className="font-semibold">{data?.needsReview?.documents || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">ДДС несъответствия</span>
              <span className="font-semibold text-rose-500">{data?.needsReview?.vatIssues || 0}</span>
            </div>
            <Link href={`/${lang}/dashboard/tasks`} className="mt-4 block w-full text-center bg-muted/50 hover:bg-muted py-2 rounded-lg text-sm font-medium transition-colors">
              Преглед на всички
            </Link>
          </CardContent>
        </Card>

        {/* Block 2: AI Inbox */}
        <Card className="shadow-sm border-0 bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500">
          <CardHeader className="pb-3 border-b border-muted flex flex-row justify-between items-center">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                <Inbox size={14} className="text-indigo-600" />
              </div>
              AI Inbox
            </CardTitle>
            {(data?.overviewStats?.inboxOpenItems ?? 0) > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {data?.overviewStats?.inboxOpenItems ?? 0} нови
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {(!data?.aiRecommendations || data.aiRecommendations.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Няма нови AI препоръки.</p>
            ) : (
              <div className="space-y-3">
                {data.aiRecommendations.map((item: any) => (
                  <div key={item.id} className="text-sm border-l-2 border-indigo-200 pl-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>
                  </div>
                ))}
                <Link href={`/${lang}/dashboard/ai-inbox`} className="mt-4 block w-full text-center bg-muted/50 hover:bg-muted py-2 rounded-lg text-sm font-medium transition-colors">
                  Отваряне на Inbox
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block 3: Approvals */}
        <Card className="shadow-sm border-0 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3 border-b border-muted flex flex-row justify-between items-center">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <CheckSquare size={14} className="text-emerald-600" />
              </div>
              Чакащи одобрения
            </CardTitle>
            {(data?.overviewStats?.approvalsPending ?? 0) > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {data?.overviewStats?.approvalsPending ?? 0} чакащи
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {data?.overviewStats?.approvalsPending === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нямате задачи за одобрение.</p>
            ) : (
              <div className="flex justify-between items-center text-sm py-2">
                <span className="text-muted-foreground">Имате {data?.overviewStats?.approvalsPending ?? 0} заявки за преглед.</span>
                <Link href={`/${lang}/dashboard/approvals`} className="text-emerald-600 hover:underline font-medium">
                  Преглед
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block 4: Deadlines */}
        <Card className="shadow-sm border-0 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500">
          <CardHeader className="pb-3 border-b border-muted">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <Clock size={14} className="text-amber-600" />
              </div>
              Срокове и рискове
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Фактури с падеж до 7 дни</span>
              <span className="font-semibold text-amber-600">{data?.upcomingDeadlines?.dueInvoices || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Документи с изтичащ срок</span>
              <span className="font-semibold">{data?.upcomingDeadlines?.expiringDocs || 0}</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}