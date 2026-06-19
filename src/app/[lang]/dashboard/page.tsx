// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, ShoppingCart, Wallet, AlertCircle, ArrowUpRight, BarChart3 } from 'lucide-react';
import { getInvoices } from './invoices/actions';
import { getPurchaseInvoices } from './purchase-invoices/actions-read';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import Link from 'next/link';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SaleBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'text-gray-400', issued: 'text-indigo-500',
    paid: 'text-emerald-500', cancelled: 'text-rose-400',
  };
  const labels: Record<string, string> = {
    draft: 'Чернова', issued: 'Издадена', paid: 'Платена', cancelled: 'Анулирана',
  };
  return <p className={`text-xs ${styles[status] || 'text-gray-400'}`}>{labels[status] || status}</p>;
}

function PurchaseBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'text-gray-400', approved: 'text-indigo-500',
    paid: 'text-emerald-500', cancelled: 'text-rose-400',
  };
  const labels: Record<string, string> = {
    draft: 'Чернова', approved: 'Одобрена', paid: 'Платена', cancelled: 'Анулирана',
  };
  return <p className={`text-xs ${styles[status] || 'text-gray-400'}`}>{labels[status] || status}</p>;
}

export default async function DashboardPage() {
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

  const invoiceData = [
    { name: 'Чернови', value: Math.max(invoices.filter(i => i.status === 'draft').length, 0) },
    { name: 'Издадени', value: Math.max(invoices.filter(i => i.status === 'issued').length, 0) },
    { name: 'Платени', value: Math.max(invoices.filter(i => i.status === 'paid').length, 1) },
  ];

  const now = new Date();
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const label = d.toLocaleDateString('bg-BG', { month: 'short' });
    const isCurrentMonth = i === 5;
    return { name: label, revenue: isCurrentMonth ? revenue : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Табло</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Актуално финансово състояние</p>
        </div>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg font-medium">
          {now.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white rounded-2xl p-5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/40">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/10" />
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
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/10" />
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

        <div className={`relative overflow-hidden bg-gradient-to-br ${netProfit >= 0 ? 'from-emerald-500 via-emerald-600 to-teal-700 shadow-emerald-200/60 dark:shadow-emerald-900/40' : 'from-orange-500 via-orange-600 to-red-700 shadow-orange-200/60 dark:shadow-orange-900/40'} text-white rounded-2xl p-5 shadow-lg`}>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/10" />
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
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/10" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                <FileText size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Продажни фактури</p>
                <p className="text-xl font-bold">{invoices.length}</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <span className="text-gray-500">{invoices.filter(i => i.status === 'draft').length} чернови</span>
              <span className="text-indigo-600">{invoices.filter(i => i.status === 'issued').length} издадени</span>
              <span className="text-emerald-600">{invoices.filter(i => i.status === 'paid').length} платени</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                <ShoppingCart size={16} className="text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Покупни фактури</p>
                <p className="text-xl font-bold">{purchases.length}</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <span className="text-gray-500">{purchases.filter(i => i.status === 'draft').length} чернови</span>
              <span className="text-indigo-600">{purchases.filter(i => i.status === 'approved').length} одобрени</span>
              <span className="text-emerald-600">{purchases.filter(i => i.status === 'paid').length} платени</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <BarChart3 size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ДДС баланс</p>
                <p className="text-xl font-bold">
                  {fmt(
                    invoices.filter(i => i.status === 'issued' || i.status === 'paid')
                      .reduce((s, i) => s + parseFloat(i.vatAmount || '0'), 0) -
                    purchases.filter(i => i.status === 'approved' || i.status === 'paid')
                      .reduce((s, i) => s + parseFloat(i.vatAmount || '0'), 0)
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <span className="text-indigo-600">
                +{fmt(invoices.filter(i => i.status === 'issued' || i.status === 'paid').reduce((s, i) => s + parseFloat(i.vatAmount || '0'), 0))} продажби
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts revenueData={revenueData} invoiceData={invoiceData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                <FileText size={13} className="text-indigo-600" />
              </div>
              Последни продажби
            </CardTitle>
            <Link href="invoices" className="text-xs text-primary hover:underline flex items-center gap-1">
              Всички <ArrowUpRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Няма фактури.</p>
            ) : (
              <div className="space-y-0.5">
                {invoices.slice(0, 5).map((inv: any) => (
                  <div key={inv.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.counterpartyName || '—'}</p>
                      <p className="text-xs text-muted-foreground">№ {inv.invoiceNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{fmt(parseFloat(inv.totalAmount || '0'))} лв.</p>
                      <SaleBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
                <ShoppingCart size={13} className="text-rose-600" />
              </div>
              Последни покупки
            </CardTitle>
            <Link href="purchase-invoices" className="text-xs text-primary hover:underline flex items-center gap-1">
              Всички <ArrowUpRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Няма покупни фактури.</p>
            ) : (
              <div className="space-y-0.5">
                {purchases.slice(0, 5).map((inv: any) => (
                  <div key={inv.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
                      <ShoppingCart size={13} className="text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.supplierName || '—'}</p>
                      <p className="text-xs text-muted-foreground">№ {inv.invoiceNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{fmt(parseFloat(inv.totalAmount || '0'))} лв.</p>
                      <PurchaseBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}