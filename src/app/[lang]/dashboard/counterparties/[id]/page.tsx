// @ts-nocheck
import { getCounterparty360Data } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, Mail, Phone, MapPin, FileText, DollarSign, AlertCircle, TrendingUp, Calendar, Zap } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function Counterparty360Page({ params }: { params: { lang: string, id: string } }) {
  const res = await getCounterparty360Data(params.id);
  
  if (!res.success || !res.data) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Грешка</h2>
        <p className="text-muted-foreground mb-4">{res.error || 'Контрагентът не е намерен.'}</p>
        <Link href={`/${params.lang}/dashboard/counterparties`}>
          <Button variant="outline">Назад към всички</Button>
        </Link>
      </div>
    );
  }

  const { counterparty, financials, invoices, transactions, aiNotes } = res.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${params.lang}/dashboard/counterparties`}>
          <Button variant="outline" size="icon" className="h-9 w-9"><ArrowLeft size={16} /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-lg">
              {counterparty.name.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                {counterparty.name}
                <Badge variant="secondary" className="text-xs">{counterparty.type === 'client' ? 'Клиент' : counterparty.type === 'supplier' ? 'Доставчик' : 'Друг'}</Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">ЕИК: {counterparty.eik || 'Няма'} {counterparty.vatNumber ? `• ДДС: ${counterparty.vatNumber}` : ''}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: General Info & AI */}
        <div className="space-y-6">
          <Card className="shadow-sm border-0 bg-slate-50 dark:bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building size={16} /> Контакти
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin size={16} className="shrink-0" />
                <span className="text-foreground">{counterparty.address || 'Няма въведен адрес'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail size={16} className="shrink-0" />
                <span className="text-foreground">{counterparty.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone size={16} className="shrink-0" />
                <span className="text-foreground">{counterparty.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground pt-2 border-t border-border">
                <span className="text-xs">Лице:</span>
                <span className="text-foreground font-medium">{counterparty.contactPerson || '—'}</span>
              </div>
            </CardContent>
          </Card>

          {aiNotes.length > 0 && (
            <Card className="shadow-sm border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 dark:text-amber-500 flex items-center gap-2">
                  <Zap size={16} /> AI Анализ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aiNotes.map((note, idx) => (
                  <div key={idx} className="flex gap-2 text-sm text-amber-800 dark:text-amber-400">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Financials & Tabs */}
        <div className="md:col-span-2 space-y-6">
          {/* Financial KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><TrendingUp size={14}/> Общ оборот</p>
                <p className="text-2xl font-bold">{fmt(financials.totalVolume)} лв.</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><DollarSign size={14}/> За плащане</p>
                <p className="text-2xl font-bold text-amber-600">{fmt(financials.totalUnpaid)} лв.</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm hidden lg:block">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><AlertCircle size={14}/> Просрочени</p>
                <p className={`text-2xl font-bold ${financials.overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {financials.overdueCount} бр.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Tabs defaultValue="invoices" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b border-border h-12 px-4 bg-transparent">
                  <TabsTrigger value="invoices" className="data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                    Фактури ({invoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
                    Банкови плащания ({transactions.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="invoices" className="p-0 m-0">
                  {invoices.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">Няма издадени фактури.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {invoices.slice(0, 10).map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                              <Badge variant="outline" className={inv.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                                {inv.status === 'paid' ? 'Платена' : inv.status === 'issued' ? 'Издадена' : inv.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <Calendar size={12}/> {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('bg-BG') : '—'}
                            </div>
                          </div>
                          <div className="text-right font-mono font-semibold">
                            {fmt(parseFloat(inv.totalAmount || '0'))} лв.
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="transactions" className="p-0 m-0">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">Няма свързани банкови транзакции.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {transactions.slice(0, 10).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{tx.date ? new Date(tx.date).toLocaleDateString('bg-BG') : '—'}</p>
                          </div>
                          <div className={`text-right font-mono font-semibold ${parseFloat(tx.amount||'0') > 0 ? 'text-emerald-600' : ''}`}>
                            {parseFloat(tx.amount||'0') > 0 ? '+' : ''}{fmt(parseFloat(tx.amount||'0'))} лв.
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
