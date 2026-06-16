import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Activity, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { getInvoices } from './accounting/actions';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';

export default async function DashboardPage() {
  const invRes = await getInvoices();
  const invoices = invRes.success ? invRes.data : [];

  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);
  const activeInvoices = invoices.filter((i: any) => i.status !== 'paid').length;
  const paidCount = invoices.filter((i: any) => i.status === 'paid').length;
  const pendingCount = invoices.filter((i: any) => i.status === 'draft' || i.status === 'sent').length;
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;

  const invoiceData = [
    { name: 'Платени', value: paidCount || 1 },
    { name: 'Чакащи', value: pendingCount || 0 },
    { name: 'Просрочени', value: overdueCount || 0 },
  ];

  const revenueData = [
    { name: 'Jan', revenue: 0 },
    { name: 'Feb', revenue: 0 },
    { name: 'Mar', revenue: 0 },
    { name: 'Apr', revenue: 0 },
    { name: 'May', revenue: 0 },
    { name: 'Jun', revenue: totalRevenue },
  ];

  const kpis = [
    {
      title: 'Общи Приходи',
      value: `${totalRevenue.toFixed(2)} лв`,
      change: '+15%',
      up: true,
      icon: Activity,
      cardBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    },
    {
      title: 'Активни Фактури',
      value: String(activeInvoices),
      change: `${pendingCount} чакат`,
      up: null,
      icon: FileText,
      cardBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    },
    {
      title: 'Служители',
      value: '12',
      change: '2 в отпуск',
      up: null,
      icon: Users,
      cardBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Табло</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Добре дошъл обратно — ето актуалното състояние.</p>
        </div>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div key={kpi.title} className={`${kpi.cardBg} text-white rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-start justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-2.5">
                <kpi.icon size={20} className="text-white" />
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                {kpi.up === true && <TrendingUp size={11} />}
                {kpi.up === false && <TrendingDown size={11} />}
                {kpi.change}
              </span>
            </div>
            <div className="text-2xl font-bold mb-1">{kpi.value}</div>
            <div className="text-sm opacity-80">{kpi.title}</div>
          </div>
        ))}
      </div>

      <DashboardCharts revenueData={revenueData} invoiceData={invoiceData} />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Последна Активност</CardTitle>
          <button className="text-xs text-primary hover:underline flex items-center gap-1">
            Виж всички <ArrowUpRight size={12} />
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {invoices.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Няма скорошна активност.</p>
            )}
            {invoices.slice(0, 5).map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Фактура <span className="text-muted-foreground">#{inv.invoiceNumber}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{inv.amount} лв.</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.issueDate).toLocaleDateString('bg-BG')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}