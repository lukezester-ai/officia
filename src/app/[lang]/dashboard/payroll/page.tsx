import React from 'react';
import { getPayrollData } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calculator, Download, CheckCircle, Wallet, Landmark, TrendingDown, Users } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default async function PayrollPage() {
  const res = await getPayrollData();
  const data = res.data || { list: [], totals: { gross: 0, doo: 0, dzpo: 0, zzo: 0, tax: 0, net: 0, totalDeductions: 0 } };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Работни заплати (ТРЗ)
            <span className="text-xs font-semibold px-2 py-1 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-md">Автоматизирано</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Калкулиране на възнаграждения, осигуровки и данъци (ДОД).</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
            <Download size={16} /> Експорт CSV
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50">
            <CheckCircle size={16} /> Потвърди и Осчетоводи
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Users size={14} className="text-blue-400" /> Активни служители
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{data.list.length}</div></CardContent>
        </Card>
        
        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-violet-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Wallet size={14} className="text-violet-400" /> Общо Бруто Разход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-400 tabular-nums drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]">{fmt(data.totals.gross)}</div>
            <p className="text-xs text-zinc-500 mt-1">Заплати преди удръжки</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-rose-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <Landmark size={14} className="text-rose-400" /> Към Бюджета (НАП)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400 tabular-nums drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">{fmt(data.totals.totalDeductions)}</div>
            <p className="text-xs text-zinc-500 mt-1">Осигуровки и ДОД (Служител)</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-white/10 bg-white/5 transition-all hover:border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium flex items-center gap-1.5">
              <TrendingDown size={14} className="text-emerald-400" /> Чиста Сума (Нето)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{fmt(data.totals.net)}</div>
            <p className="text-xs text-zinc-500 mt-1">За превод по сметки</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Calculator size={18} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Ведомост за заплати (Текущ месец)</h2>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="pl-6 text-zinc-400">Служител</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold text-violet-400/80">Бруто</TableHead>
                <TableHead className="text-right text-zinc-400 text-xs">ДОО (10.52%)</TableHead>
                <TableHead className="text-right text-zinc-400 text-xs">ДЗПО (2.2%)</TableHead>
                <TableHead className="text-right text-zinc-400 text-xs">ЗЗО (3.2%)</TableHead>
                <TableHead className="text-right text-zinc-400 text-xs text-rose-400/80">ДОД (10%)</TableHead>
                <TableHead className="text-right pr-6 text-emerald-400 font-bold">НЕТО</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.list.map((emp: any) => (
                <TableRow key={emp.id} className="hover:bg-white/5 border-white/10 transition-colors">
                  <TableCell className="pl-6">
                    <div className="font-medium text-zinc-200">{emp.firstName} {emp.lastName}</div>
                    <div className="text-xs text-zinc-500">{emp.position || '—'}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-violet-300 font-medium">{fmt(emp.gross)}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-400">{fmt(emp.doo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-400">{fmt(emp.dzpo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-400">{fmt(emp.zzo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-300">{fmt(emp.tax)}</TableCell>
                  <TableCell className="text-right pr-6 tabular-nums text-emerald-400 font-bold bg-emerald-500/5">{fmt(emp.net)}</TableCell>
                </TableRow>
              ))}
              
              {data.list.length > 0 && (
                <TableRow className="bg-black/30 hover:bg-black/30 border-t-2 border-white/10">
                  <TableCell className="pl-6 font-bold text-white uppercase text-xs tracking-wider">ОБЩО ЗА МЕСЕЦА</TableCell>
                  <TableCell className="text-right tabular-nums text-violet-400 font-bold">{fmt(data.totals.gross)}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-400 font-medium">{fmt(data.totals.doo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-400 font-medium">{fmt(data.totals.dzpo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-400 font-medium">{fmt(data.totals.zzo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-400 font-bold">{fmt(data.totals.tax)}</TableCell>
                  <TableCell className="text-right pr-6 tabular-nums text-emerald-400 font-black text-lg bg-emerald-500/10">{fmt(data.totals.net)}</TableCell>
                </TableRow>
              )}

              {data.list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-zinc-500">
                    <p>Няма активни служители за калкулиране на ведомост.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="text-xs text-zinc-500 text-center">
        *Изчисленията са базирани на параметрите за 3-та категория труд за текущата година. Приложен е максимален осигурителен доход.
      </div>
    </div>
  );
}
