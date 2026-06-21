'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { getReportsData } from './actions';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getReportsData(year);
      if (res.success) {
        setData(res.data);
      }
      setLoading(false);
    }
    load();
  }, [year]);

  const exportCSV = () => {
    if (!data) return;
    
    // Example simple CSV generation for monthly P&L
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Месец,Приходи,Разходи,Печалба\n";
    
    data.monthlyData.forEach((row: any) => {
      csvContent += `${row.name},${row.Приходи},${row.Разходи},${row.Печалба}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `officia_pnl_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    // For a real app, use jspdf. For now, simple print dialog handles PDF export well enough!
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center">Зареждане на отчети...</div>;
  }

  const ytdRev = Math.abs(Number(data?.ytdPnL?.revenue?.total || 0));
  const ytdExp = Math.abs(Number(data?.ytdPnL?.expenses?.total || 0));
  const netProfit = ytdRev - ytdExp;

  return (
    <div id="main-content" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Финансови Отчети</h1>
          <p className="text-gray-500 mt-1">Обобщение на финансовото състояние на фирмата за {year} г.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="border-gray-200 rounded-md shadow-sm text-sm"
          >
            {[...Array(5)].map((_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <FileSpreadsheet size={16} />
            Експорт CSV
          </Button>
          <Button variant="default" onClick={exportPDF} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Download size={16} />
            Свали PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Общо Приходи</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{ytdRev.toLocaleString('bg-BG', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50 text-green-600">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Общо Разходи</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{ytdExp.toLocaleString('bg-BG', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <TrendingDown size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Нетна Печалба</p>
                <p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {netProfit.toLocaleString('bg-BG', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <DollarSign size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-gray-100/50 p-1 print:hidden">
          <TabsTrigger value="overview">Преглед</TabsTrigger>
          <TabsTrigger value="pnl">ОПР (P&L)</TabsTrigger>
          <TabsTrigger value="balance">Баланс</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6 print:block">
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 print:shadow-none print:ring-0">
            <CardHeader>
              <CardTitle>Приходи и Разходи по месеци</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.monthlyData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} tickFormatter={(value) => `${value} €`} />
                    <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Приходи" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="Разходи" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="mt-6">
          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
            <CardHeader>
              <CardTitle>Отчет за Приходите и Разходите (ОПР)</CardTitle>
              <CardDescription>За периода {year}-01-01 до {year}-12-31</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Показател</th>
                      <th className="px-6 py-3 text-right">Сума (EUR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-green-50/30">
                      <td className="px-6 py-4 font-semibold text-gray-900">I. Общо Приходи от Дейността</td>
                      <td className="px-6 py-4 font-semibold text-right text-gray-900">
                        {ytdRev.toLocaleString('bg-BG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-red-50/30">
                      <td className="px-6 py-4 font-semibold text-gray-900">II. Общо Разходи за Дейността</td>
                      <td className="px-6 py-4 font-semibold text-right text-gray-900">
                        {ytdExp.toLocaleString('bg-BG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-indigo-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900">III. Счетоводна Печалба / Загуба</td>
                      <td className="px-6 py-4 font-bold text-right text-gray-900">
                        {netProfit.toLocaleString('bg-BG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="mt-6">
          <Card className="border-0 shadow-sm ring-1 ring-gray-100">
            <CardHeader>
              <CardTitle>Счетоводен Баланс</CardTitle>
              <CardDescription>Към текущата дата</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold border-b pb-2 mb-4">Актив (Assets)</h3>
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 text-gray-600">Текущи активи</td>
                        <td className="py-3 text-right font-medium">{Math.abs(Number(data?.balanceSheet?.totalAssets || 0)).toLocaleString('bg-BG', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                      <tr className="bg-gray-50/50">
                        <td className="py-3 px-2 font-bold text-gray-900">Общо Сума на Актива</td>
                        <td className="py-3 px-2 font-bold text-right text-gray-900">{Math.abs(Number(data?.balanceSheet?.totalAssets || 0)).toLocaleString('bg-BG', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="text-lg font-semibold border-b pb-2 mb-4">Пасив (Liabilities & Equity)</h3>
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 text-gray-600">Собствен капитал</td>
                        <td className="py-3 text-right font-medium">{Math.abs(Number(data?.balanceSheet?.totalEquity || 0)).toLocaleString('bg-BG', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-gray-600">Текущи задължения</td>
                        <td className="py-3 text-right font-medium">{Math.abs(Number(data?.balanceSheet?.totalLiabilities || 0)).toLocaleString('bg-BG', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                      <tr className="bg-gray-50/50">
                        <td className="py-3 px-2 font-bold text-gray-900">Общо Сума на Пасива</td>
                        <td className="py-3 px-2 font-bold text-right text-gray-900">{Math.abs(Number(data?.balanceSheet?.totalLiabilitiesAndEquity || 0)).toLocaleString('bg-BG', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #main-content, #main-content * {
            visibility: visible;
          }
          #main-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}} />
    </div>
  );
}
