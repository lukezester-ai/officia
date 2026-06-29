import React from 'react';
import { getHrData } from './actions';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, Plus, ChevronRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default async function HrPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const res = await getHrData();
  const data = res.success && res.data ? res.data : { employees: [], alerts: [] };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Кадри (HR)</h1>
          <p className="text-sm text-zinc-400 mt-1">Управление на служители, документи и договори.</p>
        </div>
        <Link href={`/${lang}/dashboard/hr/new`}>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50">
            <Plus size={16} /> Добави служител
          </Button>
        </Link>
      </div>

      {data.alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> HR Сигнали (Автоматичен одит)
          </h3>
          <ul className="list-disc pl-8 space-y-1 text-sm text-amber-300/80">
            {data.alerts.map((a: any, i: number) => (
              <li key={i}>{a.name} - {a.issue}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="shadow-sm border-white/10 bg-white/5 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="pl-6 text-zinc-400">Служител</TableHead>
                <TableHead className="text-zinc-400">Длъжност</TableHead>
                <TableHead className="text-zinc-400">Отдел</TableHead>
                <TableHead className="text-zinc-400">Тип договор</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.employees.map(emp => (
                <TableRow key={emp.id} className="hover:bg-white/5 border-white/10 transition-colors group">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                        {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-200">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-zinc-500">{emp.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">{emp.position || '—'}</TableCell>
                  <TableCell className="text-zinc-300">{emp.department || '—'}</TableCell>
                  <TableCell className="text-zinc-300">
                    {emp.contractType === 'full_time' ? 'Трудов договор' : emp.contractType === 'part_time' ? 'Непълно работно време' : 'Граждански / Изпълнител'}
                  </TableCell>
                  <TableCell>
                    {!emp.isActive ? (
                      <Badge variant="outline" className="text-zinc-400 border-zinc-600 bg-white/5">Бивш служител</Badge>
                    ) : emp.workStatus === 'on_leave' ? (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 gap-1.5 px-2">В отпуск</Badge>
                    ) : emp.workStatus === 'sick_leave' ? (
                      <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 gap-1.5 px-2">В болничен</Badge>
                    ) : emp.workStatus === 'unpaid_leave' ? (
                      <Badge variant="outline" className="border-slate-500/30 text-slate-400 bg-slate-500/10 gap-1.5 px-2">Неплатен отпуск</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-1.5 px-2"><CheckCircle size={12}/> На работа</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Link href={`/${lang}/dashboard/hr/${emp.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-white/10">
                        Профил <ChevronRight size={14} />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {data.employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-zinc-500">
                    <Users size={32} className="mx-auto mb-3 opacity-50" />
                    <p>Няма въведени служители.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
