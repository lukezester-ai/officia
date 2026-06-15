import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Activity, Clock } from 'lucide-react';
import { getInvoices } from './accounting/actions';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';

export default async function DashboardPage() {
  const invRes = await getInvoices();
  const invoices = invRes.success ? invRes.data : [];

  // Изчисляване на KPIs
  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);
  const activeInvoices = invoices.filter((i: any) => i.status !== 'paid').length;
  
  // Данни за Pie Chart (Invoice Status)
  const paidCount = invoices.filter((i: any) => i.status === 'paid').length;
  const pendingCount = invoices.filter((i: any) => i.status === 'draft' || i.status === 'sent').length;
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;
  
  const invoiceData = [
    { name: 'Платени', value: paidCount || 1 }, // Fallback to 1 if empty to show the chart
    { name: 'Чакащи', value: pendingCount || 0 },
    { name: 'Просрочени', value: overdueCount || 0 },
  ];

  // Данни за Area Chart (Месечни приходи - опростена логика за MVP)
  const revenueData = [
    { name: 'Jan', revenue: 0 },
    { name: 'Feb', revenue: 0 },
    { name: 'Mar', revenue: 0 },
    { name: 'Apr', revenue: 0 },
    { name: 'May', revenue: 0 },
    { name: 'Jun', revenue: totalRevenue }, // Всичко в текущия месец
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Табло
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Общи Приходи</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalRevenue.toFixed(2)} лв</div>
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              +15% спрямо миналия месец
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Активни Фактури</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{activeInvoices}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">{pendingCount}</span> чакат плащане
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Служители</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">12</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">2</span> в отпуск
            </p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts revenueData={revenueData} invoiceData={invoiceData} />

      {/* Recent Activity */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Последна Активност
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.slice(0, 4).map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-4 last:border-0 last:pb-0">
                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <FileText size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Фактура <span className="text-slate-500">#{inv.invoiceNumber}</span>
                  </p>
                  <p className="text-xs text-slate-500">{inv.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{inv.amount} лв.</p>
                  <p className="text-xs text-slate-500">
                    {new Date(inv.issueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">
                Няма скорошна активност.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
