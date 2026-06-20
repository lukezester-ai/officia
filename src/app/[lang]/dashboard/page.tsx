// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, ShoppingCart, Wallet, AlertCircle, ArrowUpRight, BarChart3, Inbox, Clock, CheckSquare } from 'lucide-react';
import { getDashboardData } from './actions';
import Link from 'next/link';
import { getInvoices } from './invoices/actions';
import { getPurchaseInvoices } from './purchase-invoices/actions-read';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const data = await getDashboardData().catch(() => null);
  
  // We keep pulling raw invoice data just in case we need the lists for now
  const [invRes, purRes] = await Promise.all([
    getInvoices().catch(() => ({ success: false, data: [] })),
    getPurchaseInvoices().catch(() => ({ success: false, data: [] })),
  ]);

  const invoices: any[] = invRes.success ? (invRes as any).data : [];
  const purchases: any[] = purRes.success ? (purRes as any).data : [];

  const revenue = invoices
    .filter(i => i.status === 'issued' || i.status === 'paid')
    .reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);

  const expenses = purchases
    .filter(i => i.status === 'approved' || i.status === 'paid')
    .reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);

  const outstanding = invoices.filter(i => i.status === 'issued');
  const outstandingAmount = outstanding.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
  const netProfit = revenue - expenses;

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

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white rounded-2xl p-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                <TrendingUp size={18} />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">Приходи</span>
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1">{fmt(revenue)}</div>
            <div className="text-sm text-indigo-100">лв. от продажби</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 text-white rounded-2xl p-5 shadow-lg shadow-rose-200/60 dark:shadow-rose-900/40">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                <ShoppingCart size={18} />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">Разходи</span>
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1">{fmt(expenses)}</div>
            <div className="text-sm text-rose-100">лв. от покупки</div>
          </div>
        </div>

        <div className={`relative overflow-hidden bg-gradient-to-br ${netProfit >= 0 ? 'from-emerald-500 via-emerald-600 to-teal-700 shadow-emerald-200/60' : 'from-orange-500 via-orange-600 to-red-700 shadow-orange-200/60'} text-white rounded-2xl p-5 shadow-lg`}>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                <Wallet size={18} />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">Резултат</span>
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1">{fmt(netProfit)}</div>
            <div className={`text-sm ${netProfit >= 0 ? 'text-emerald-100' : 'text-orange-100'}`}>лв. нетна печалба</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white rounded-2xl p-5 shadow-lg shadow-amber-200/60 dark:shadow-amber-900/40">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                <AlertCircle size={18} />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">{outstanding.length} бр.</span>
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1">{fmt(outstandingAmount)}</div>
            <div className="text-sm text-amber-100">лв. неплатени</div>
          </div>
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
            <Link href="/dashboard/ai-inbox" className="mt-4 block w-full text-center bg-muted/50 hover:bg-muted py-2 rounded-lg text-sm font-medium transition-colors">
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
            {data?.overviewStats?.inboxOpenItems > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {data.overviewStats.inboxOpenItems} нови
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
                <Link href="/dashboard/ai-inbox" className="mt-4 block w-full text-center bg-muted/50 hover:bg-muted py-2 rounded-lg text-sm font-medium transition-colors">
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
            {data?.overviewStats?.approvalsPending > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {data.overviewStats.approvalsPending} чакащи
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {data?.overviewStats?.approvalsPending === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нямате задачи за одобрение.</p>
            ) : (
              <div className="flex justify-between items-center text-sm py-2">
                <span className="text-muted-foreground">Имате {data.overviewStats.approvalsPending} заявки за преглед.</span>
                <Link href="/dashboard/approvals" className="text-emerald-600 hover:underline font-medium">
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