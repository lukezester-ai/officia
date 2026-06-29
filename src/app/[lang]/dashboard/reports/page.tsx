import React from 'react';
import { getReportsData } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, CheckCircle2, Bookmark, Download } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ReportsPage() {
  const res = await getReportsData();
  const data = res.success && res.data ? res.data : {
    revenue: 0, expenses: 0, profit: 0, totalUnpaidSales: 0, totalUnpaidPurchases: 0, overdueCount: 0,
    cfoSummary: "Липсват данни.", cfoInsights: []
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отчети & CFO Copilot</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Управленски анализи и AI бизнес съвети.</p>
        </div>
        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
          <Download size={16} /> Експорт (PDF)
        </Button>
      </div>

      {/* CFO Copilot Panel */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-sm">
            <BrainCircuit size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-indigo-950 dark:text-indigo-200 mb-2">CFO Copilot Месечно обобщение</h3>
            <p className="text-indigo-900/80 dark:text-indigo-300/80 mb-4">{data.cfoSummary}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.cfoInsights.map((insight: any, i: number) => (
                <div key={i} className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg flex items-start gap-3 border border-white/40 dark:border-slate-800">
                  {insight.type === 'risk' && <AlertTriangle size={16} className="text-amber-500 mt-0.5" />}
                  {insight.type === 'opportunity' && <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />}
                  {insight.type === 'alert' && <TrendingDown size={16} className="text-rose-500 mt-0.5" />}
                  <span className="text-sm text-slate-700 dark:text-slate-300">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="financials" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
          <TabsTrigger value="financials" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Финансови</TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Фактури & Плащания</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">Документи</TabsTrigger>
          <TabsTrigger value="efficiency" className="rounded-lg h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">AI Ефективност</TabsTrigger>
        </TabsList>

        <TabsContent value="financials" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-0">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Приходи</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{fmt(data.revenue)} €</h3>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><TrendingUp size={12}/> +12% спрямо м.м.</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Разходи</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{fmt(data.expenses)} €</h3>
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1"><TrendingUp size={12}/> +5% спрямо м.м.</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900">
              <CardContent className="p-6">
                <p className="text-sm font-medium opacity-80 mb-2">Нетна печалба (Баланс)</p>
                <h3 className="text-3xl font-bold">{fmt(data.profit)} €</h3>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Вземания от клиенти</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Общо неплатени (Чакащи)</p>
                      <h4 className="text-xl font-bold mt-1">{fmt(data.totalUnpaidSales)} €</h4>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Просрочени фактури</p>
                      <h4 className="text-xl font-bold text-rose-600 mt-1">{data.overdueCount} бр.</h4>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">Изпрати напомняне <ArrowRight size={14}/></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Задължения към доставчици</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">Общо задължения</p>
                      <h4 className="text-xl font-bold mt-1">{fmt(data.totalUnpaidPurchases)} €</h4>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">За плащане тази седмица</p>
                      <h4 className="text-xl font-bold mt-1">0.00 €</h4>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">Подготви преводи <ArrowRight size={14}/></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 m-0">
          <Card className="shadow-sm border-0"><CardContent className="p-8 text-center text-muted-foreground">Статистика за обработени документи...</CardContent></Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4 m-0">
          <Card className="shadow-sm border-0">
            <CardContent className="p-8 text-center">
              <BrainCircuit size={48} className="mx-auto text-indigo-500 mb-4 opacity-50"/>
              <h3 className="text-xl font-bold mb-2">AI Ефективност този месец</h3>
              <p className="text-muted-foreground mb-6">Officia AI ви е спестил приблизително 14 часа ръчен труд.</p>
              
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <h4 className="text-2xl font-bold text-indigo-600">89%</h4>
                  <p className="text-xs text-muted-foreground mt-1">Автоматично разпознати документи</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <h4 className="text-2xl font-bold text-indigo-600">92%</h4>
                  <p className="text-xs text-muted-foreground mt-1">Точност на банково съпоставяне</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <h4 className="text-2xl font-bold text-indigo-600">12</h4>
                  <p className="text-xs text-muted-foreground mt-1">Открити счетоводни аномалии</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
